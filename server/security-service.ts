/**
 * Security Service
 * Implements security controls including prompt injection detection,
 * input sanitization, and data protection
 */

import { log } from './vite.js';
import { Request, Response, NextFunction } from 'express';

interface SecurityViolation {
  type: 'prompt_injection' | 'data_poisoning' | 'unauthorized_access' | 'rate_limit' | 'input_validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

interface SecurityConfig {
  maxInputLength: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  promptInjectionThreshold: number;
  enableInputSanitization: boolean;
  enableContentScanning: boolean;
}

class SecurityService {
  private violations: SecurityViolation[] = [];
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private config: SecurityConfig;

  // Patterns for detecting prompt injection attempts
  private promptInjectionPatterns = [
    /ignore\s+previous\s+instructions/i,
    /forget\s+everything\s+above/i,
    /system\s*:\s*you\s+are\s+now/i,
    /act\s+as\s+if\s+you\s+are/i,
    /pretend\s+to\s+be/i,
    /roleplay\s+as/i,
    /simulate\s+being/i,
    /override\s+your\s+instructions/i,
    /disregard\s+your\s+programming/i,
    /bypass\s+your\s+safety/i,
    /ignore\s+your\s+guidelines/i,
    /\\n\\n---\\n\\n/,
    /\*\*\*SYSTEM\*\*\*/i,
    /\[INST\]/i,
    /<\|system\|>/i,
    /assistant\s*:\s*i\s+will\s+help/i
  ];

  // Patterns for detecting data poisoning attempts
  private dataPoisoningPatterns = [
    /sql\s*injection/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /update\s+.*\s+set/i,
    /insert\s+into/i,
    /<script[^>]*>/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /localStorage\./i,
    /sessionStorage\./i
  ];

  // Sensitive data patterns
  private sensitiveDataPatterns = [
    /\b(?:password|pwd|passwd)\s*[:=]\s*\S+/i,
    /\b(?:api[_-]?key|apikey)\s*[:=]\s*[a-zA-Z0-9-_]+/i,
    /\b(?:secret|token)\s*[:=]\s*[a-zA-Z0-9-_]+/i,
    /\b(?:ssn|social\s*security)\s*[:=]?\s*\d{3}-?\d{2}-?\d{4}/i,
    /\b(?:credit\s*card|cc)\s*[:=]?\s*\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/i,
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
    /\b\d{3}-\d{3}-\d{4}\b/ // Phone numbers
  ];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      maxInputLength: config.maxInputLength || 10000,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedFileTypes: config.allowedFileTypes || ['.txt', '.pdf', '.docx', '.xlsx', '.csv'],
      rateLimitWindowMs: config.rateLimitWindowMs || 60000, // 1 minute
      rateLimitMaxRequests: config.rateLimitMaxRequests || 100,
      promptInjectionThreshold: config.promptInjectionThreshold || 0.7,
      enableInputSanitization: config.enableInputSanitization ?? true,
      enableContentScanning: config.enableContentScanning ?? true
    };

    // Clean up old violations and rate limit entries periodically
    setInterval(() => {
      this.cleanupOldEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Validate and sanitize user input
   */
  validateInput(input: string, context: string = 'general'): {
    valid: boolean;
    sanitized: string;
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];
    let sanitized = input;

    // Length validation
    if (input.length > this.config.maxInputLength) {
      violations.push({
        type: 'input_validation',
        severity: 'medium',
        message: `Input exceeds maximum length of ${this.config.maxInputLength} characters`,
        timestamp: new Date()
      });
      sanitized = input.substring(0, this.config.maxInputLength);
    }

    // Prompt injection detection
    const promptInjectionScore = this.detectPromptInjection(input);
    if (promptInjectionScore > this.config.promptInjectionThreshold) {
      violations.push({
        type: 'prompt_injection',
        severity: 'high',
        message: `Potential prompt injection detected (score: ${promptInjectionScore})`,
        timestamp: new Date()
      });
    }

    // Data poisoning detection
    if (this.detectDataPoisoning(input)) {
      violations.push({
        type: 'data_poisoning',
        severity: 'high',
        message: 'Potential data poisoning attempt detected',
        timestamp: new Date()
      });
    }

    // Input sanitization
    if (this.config.enableInputSanitization) {
      sanitized = this.sanitizeInput(sanitized);
    }

    // Content scanning for sensitive data
    if (this.config.enableContentScanning) {
      const sensitiveDataFound = this.detectSensitiveData(sanitized);
      if (sensitiveDataFound.length > 0) {
        violations.push({
          type: 'input_validation',
          severity: 'medium',
          message: `Sensitive data detected: ${sensitiveDataFound.join(', ')}`,
          timestamp: new Date()
        });
        
        // Mask sensitive data
        sanitized = this.maskSensitiveData(sanitized);
      }
    }

    // Log violations
    violations.forEach(violation => {
      this.logViolation(violation);
    });

    return {
      valid: violations.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
      sanitized,
      violations
    };
  }

  /**
   * Detect prompt injection attempts
   */
  private detectPromptInjection(input: string): number {
    let score = 0;
    const totalPatterns = this.promptInjectionPatterns.length;

    for (const pattern of this.promptInjectionPatterns) {
      if (pattern.test(input)) {
        score += 1;
      }
    }

    // Additional heuristics
    const suspiciousChars = (input.match(/[\\\/\*\#\|]/g) || []).length;
    const suspiciousWords = (input.match(/\b(system|admin|root|override|bypass|ignore|forget|disregard)\b/gi) || []).length;
    const repeatedNewlines = (input.match(/\n{3,}/g) || []).length;

    score += suspiciousChars * 0.1;
    score += suspiciousWords * 0.2;
    score += repeatedNewlines * 0.3;

    return Math.min(score / totalPatterns, 1);
  }

  /**
   * Detect data poisoning attempts
   */
  private detectDataPoisoning(input: string): boolean {
    for (const pattern of this.dataPoisoningPatterns) {
      if (pattern.test(input)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect sensitive data in input
   */
  private detectSensitiveData(input: string): string[] {
    const found: string[] = [];
    
    for (const pattern of this.sensitiveDataPatterns) {
      if (pattern.test(input)) {
        if (pattern.source.includes('password|pwd|passwd')) {
          found.push('password');
        } else if (pattern.source.includes('api')) {
          found.push('api_key');
        } else if (pattern.source.includes('secret|token')) {
          found.push('secret_token');
        } else if (pattern.source.includes('ssn')) {
          found.push('ssn');
        } else if (pattern.source.includes('credit')) {
          found.push('credit_card');
        } else if (pattern.source.includes('@')) {
          found.push('email');
        } else if (pattern.source.includes('\\d{3}-\\d{3}')) {
          found.push('phone');
        }
      }
    }
    
    return [...new Set(found)];
  }

  /**
   * Sanitize input by removing/escaping dangerous characters
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/eval\s*\(/gi, '') // Remove eval calls
      .replace(/document\./gi, '') // Remove document references
      .replace(/window\./gi, '') // Remove window references
      .trim();
  }

  /**
   * Mask sensitive data in input
   */
  private maskSensitiveData(input: string): string {
    let masked = input;
    
    // Mask passwords
    masked = masked.replace(/\b(?:password|pwd|passwd)\s*[:=]\s*\S+/gi, 'password=[MASKED]');
    
    // Mask API keys
    masked = masked.replace(/\b(?:api[_-]?key|apikey)\s*[:=]\s*[a-zA-Z0-9-_]+/gi, 'api_key=[MASKED]');
    
    // Mask secrets and tokens
    masked = masked.replace(/\b(?:secret|token)\s*[:=]\s*[a-zA-Z0-9-_]+/gi, 'secret=[MASKED]');
    
    // Mask SSN
    masked = masked.replace(/\b(?:ssn|social\s*security)\s*[:=]?\s*\d{3}-?\d{2}-?\d{4}/gi, 'ssn=[MASKED]');
    
    // Mask credit cards
    masked = masked.replace(/\b(?:credit\s*card|cc)\s*[:=]?\s*\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/gi, 'credit_card=[MASKED]');
    
    // Mask emails (partially)
    masked = masked.replace(/\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, 
      (match, user, domain) => `${user.substring(0, 2)}***@${domain}`);
    
    // Mask phone numbers
    masked = masked.replace(/\b\d{3}-\d{3}-\d{4}\b/g, 'XXX-XXX-XXXX');
    
    return masked;
  }

  /**
   * Rate limiting middleware
   */
  rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const entry = this.rateLimitMap.get(key);
    
    if (!entry) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimitWindowMs
      });
      return next();
    }
    
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.config.rateLimitWindowMs;
    } else {
      entry.count++;
    }
    
    if (entry.count > this.config.rateLimitMaxRequests) {
      this.logViolation({
        type: 'rate_limit',
        severity: 'medium',
        message: `Rate limit exceeded: ${entry.count} requests`,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': this.config.rateLimitMaxRequests.toString(),
      'X-RateLimit-Remaining': (this.config.rateLimitMaxRequests - entry.count).toString(),
      'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
    });
    
    next();
  };

  /**
   * File upload security validation
   */
  validateFileUpload(file: Express.Multer.File): {
    valid: boolean;
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];
    
    // File size validation
    if (file.size > this.config.maxFileSize) {
      violations.push({
        type: 'input_validation',
        severity: 'medium',
        message: `File size exceeds maximum allowed: ${this.config.maxFileSize} bytes`,
        timestamp: new Date()
      });
    }
    
    // File type validation
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!this.config.allowedFileTypes.includes(fileExtension)) {
      violations.push({
        type: 'input_validation',
        severity: 'medium',
        message: `File type not allowed: ${fileExtension}`,
        timestamp: new Date()
      });
    }
    
    // File name validation
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      violations.push({
        type: 'input_validation',
        severity: 'high',
        message: 'Invalid file name - path traversal attempt detected',
        timestamp: new Date()
      });
    }
    
    violations.forEach(violation => {
      this.logViolation(violation);
    });
    
    return {
      valid: violations.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
      violations
    };
  }

  /**
   * Log security violation
   */
  private logViolation(violation: SecurityViolation): void {
    this.violations.push(violation);
    
    // Log to system logger
    log('Security violation detected: ' + violation.type + ' (' + violation.severity + ') - ' + violation.message);
    
    // Keep only last 1000 violations in memory
    if (this.violations.length > 1000) {
      this.violations.shift();
    }
  }

  /**
   * Get security violations
   */
  getViolations(limit: number = 100): SecurityViolation[] {
    return this.violations.slice(-limit);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalViolations: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
    recentViolations: SecurityViolation[];
  } {
    const violationsByType: Record<string, number> = {};
    const violationsBySeverity: Record<string, number> = {};
    
    this.violations.forEach(violation => {
      violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
    });
    
    return {
      totalViolations: this.violations.length,
      violationsByType,
      violationsBySeverity,
      recentViolations: this.violations.slice(-10)
    };
  }

  /**
   * Clean up old entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Clean up old violations (keep only last 24 hours)
    this.violations = this.violations.filter(v => v.timestamp.getTime() > oneHourAgo);
    
    // Clean up old rate limit entries
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log('Security configuration updated');
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

export const securityService = new SecurityService({
  maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '10000'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  promptInjectionThreshold: parseFloat(process.env.PROMPT_INJECTION_THRESHOLD || '0.7'),
  enableInputSanitization: process.env.ENABLE_INPUT_SANITIZATION !== 'false',
  enableContentScanning: process.env.ENABLE_CONTENT_SCANNING !== 'false'
});

export default securityService;