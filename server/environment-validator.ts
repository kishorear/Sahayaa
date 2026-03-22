/**
 * Environment Validation Service
 * Validates all required environment variables at startup
 */

import { log } from './vite.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    required: number;
    missing: number;
    configured: number;
  };
}

interface EnvironmentConfig {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  description: string;
}

class EnvironmentValidator {
  private readonly environmentConfig: EnvironmentConfig[] = [
    // Core Database
    {
      name: 'DATABASE_URL',
      required: true,
      validator: (value: string) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      description: 'PostgreSQL connection string'
    },
    
    // Session Management
    {
      name: 'SESSION_SECRET',
      required: true,
      validator: (value: string) => value.length >= 32,
      description: 'Session secret (minimum 32 characters)'
    },
    
    // AI Providers (at least one required)
    {
      name: 'OPENAI_API_KEY',
      required: false,
      validator: (value: string) => value.startsWith('sk-'),
      description: 'OpenAI API key'
    },
    {
      name: 'GOOGLE_AI_API_KEY',
      required: false,
      validator: (value: string) => value.length > 10,
      description: 'Google AI API key'
    },
    {
      name: 'ANTHROPIC_API_KEY',
      required: false,
      validator: (value: string) => value.startsWith('sk-ant-'),
      description: 'Anthropic API key'
    },
    
    // Microservices (optional with defaults)
    {
      name: 'DATA_SERVICE_URL',
      required: false,
      validator: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      description: 'Data service URL (defaults to http://localhost:8000)'
    },
    {
      name: 'AGENT_SERVICE_URL',
      required: false,
      validator: (value: string) => value.startsWith('http://') || value.startsWith('https://'),
      description: 'Agent service URL (defaults to http://localhost:8001)'
    },
    
    // Vector Storage
    {
      name: 'VECTOR_STORAGE_PATH',
      required: false,
      description: 'Vector storage directory path'
    },
    
    // Performance Configuration
    {
      name: 'MAX_VECTOR_COUNT_BEFORE_SHARD',
      required: false,
      validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
      description: 'Maximum vector count before sharding'
    },
    {
      name: 'QDRANT_TIMEOUT_MS',
      required: false,
      validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
      description: 'Qdrant timeout in milliseconds'
    },
    {
      name: 'VECTOR_DIMENSION',
      required: false,
      validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
      description: 'Vector dimension size'
    },
    
    // Logging and Monitoring
    {
      name: 'LOG_LEVEL',
      required: false,
      validator: (value: string) => ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(value.toUpperCase()),
      description: 'Logging level'
    },
    {
      name: 'LOG_FORMAT',
      required: false,
      validator: (value: string) => ['json', 'text'].includes(value.toLowerCase()),
      description: 'Log format (json or text)'
    },
    
    // Security
    {
      name: 'CORS_ORIGINS',
      required: false,
      description: 'Allowed CORS origins'
    },
    {
      name: 'RATE_LIMIT_WINDOW_MS',
      required: false,
      validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
      description: 'Rate limit window in milliseconds'
    },
    {
      name: 'RATE_LIMIT_MAX_REQUESTS',
      required: false,
      validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
      description: 'Maximum requests per rate limit window'
    }
  ];

  validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let configuredCount = 0;

    // Check each environment variable
    for (const config of this.environmentConfig) {
      const value = process.env[config.name];
      
      if (!value) {
        if (config.required) {
          errors.push(`Required environment variable ${config.name} is not set. ${config.description}`);
        } else {
          warnings.push(`Optional environment variable ${config.name} is not set. ${config.description}`);
        }
      } else {
        configuredCount++;
        
        // Run custom validator if provided
        if (config.validator && !config.validator(value)) {
          errors.push(`Environment variable ${config.name} has invalid format. ${config.description}`);
        }
      }
    }

    // Special validation: At least one AI provider must be configured
    const aiProviders = ['OPENAI_API_KEY', 'GOOGLE_AI_API_KEY', 'ANTHROPIC_API_KEY'];
    const configuredAiProviders = aiProviders.filter(provider => process.env[provider]);
    
    if (configuredAiProviders.length === 0) {
      errors.push('At least one AI provider must be configured (OPENAI_API_KEY, GOOGLE_AI_API_KEY, or ANTHROPIC_API_KEY)');
    }

    // Check for development vs production configuration
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      this.validateProductionEnvironment(errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        required: this.environmentConfig.filter(c => c.required).length,
        missing: this.environmentConfig.filter(c => c.required && !process.env[c.name]).length,
        configured: configuredCount
      }
    };
  }

  private validateProductionEnvironment(errors: string[], warnings: string[]): void {
    // Production-specific validations
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 64) {
      warnings.push('SESSION_SECRET should be at least 64 characters long in production');
    }

    if (!process.env.CORS_ORIGINS) {
      warnings.push('CORS_ORIGINS should be configured in production');
    }

    if (!process.env.RATE_LIMIT_WINDOW_MS) {
      warnings.push('Rate limiting should be configured in production');
    }

    if (process.env.LOG_LEVEL !== 'INFO' && process.env.LOG_LEVEL !== 'WARN' && process.env.LOG_LEVEL !== 'ERROR') {
      warnings.push('Log level should be INFO, WARN, or ERROR in production');
    }

    if (!process.env.LOG_FORMAT || process.env.LOG_FORMAT !== 'json') {
      warnings.push('Log format should be json in production for better monitoring');
    }
  }

  logValidationResults(result: ValidationResult): void {
    if (result.valid) {
      log('Environment validation successful: ' + result.summary.configured + '/' + result.summary.required + ' configured');
      
      if (result.warnings.length > 0) {
        log('Environment validation warnings: ' + result.warnings.join(', '));
      }
    } else {
      log('Environment validation failed: ' + result.errors.join(', '));
    }
  }

  getEnvironmentSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      nodeEnv: process.env.NODE_ENV || 'development',
      configuredVariables: {},
      missingRequired: [],
      optionalNotSet: []
    };

    for (const config of this.environmentConfig) {
      const value = process.env[config.name];
      
      if (value) {
        // Don't log sensitive values
        if (config.name.includes('SECRET') || config.name.includes('KEY') || config.name.includes('PASSWORD')) {
          summary.configuredVariables[config.name] = '[REDACTED]';
        } else {
          summary.configuredVariables[config.name] = value;
        }
      } else {
        if (config.required) {
          summary.missingRequired.push(config.name);
        } else {
          summary.optionalNotSet.push(config.name);
        }
      }
    }

    return summary;
  }
}

export const environmentValidator = new EnvironmentValidator();

export function validateEnvironmentAtStartup(): boolean {
  const result = environmentValidator.validateEnvironment();
  environmentValidator.logValidationResults(result);
  
  if (!result.valid) {
    log('Application cannot start due to environment validation errors');
    process.exit(1);
  }
  
  return result.valid;
}