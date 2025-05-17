import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { generateChatResponse } from "../ai";
import type { ChatMessage } from "../ai";
import { buildAIContext } from "../data-source-service";
import jwt from "jsonwebtoken";

/**
 * Widget chat authentication request validation schema
 */
const authenticatedChatRequestSchema = z.object({
  tenantId: z.number(),
  message: z.string(),
  sessionId: z.string(),
  userId: z.number().optional(),
  context: z.object({
    url: z.string().optional(),
    title: z.string().optional()
  }).optional()
});

/**
 * Verify authentication token middleware
 */
function verifyAuthToken(req: Request, res: Response, next: any) {
  const authToken = req.headers['x-auth-token'] as string;
  const userId = req.body.userId;
  
  // If no userId is provided or no token, skip token verification
  if (!userId || !authToken) {
    return next();
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(
      authToken, 
      process.env.JWT_SECRET || 'support-ai-widget-secret'
    ) as { userId: number; tenantId: number; email: string };
    
    // Verify the token belongs to the user in the request
    if (decoded.userId !== userId) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    // Add user info to request
    req.authUser = {
      id: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
}

/**
 * Register routes for authenticated widget chat
 */
export function registerWidgetChatAuthRoutes(app: Express): void {
  /**
   * Process authenticated chat message
   * 
   * POST /api/widget/chat/auth
   */
  app.post('/api/widget/chat/auth', verifyAuthToken, async (req: Request, res: Response) => {
    try {
      // Validate API key in header
      const authHeader = req.headers.authorization || '';
      const apiKey = authHeader.replace('ApiKey ', '');
      
      if (!apiKey) {
        return res.status(401).json({ message: 'API key is required' });
      }
      
      // Validate request
      const result = authenticatedChatRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: result.error.format()
        });
      }
      
      const { tenantId, message, sessionId, userId, context } = result.data;
      
      // Verify tenant by API key
      const tenant = await storage.getTenantByApiKey(apiKey);
      
      if (!tenant || tenant.id !== tenantId) {
        return res.status(401).json({ message: 'Invalid API key or tenant ID' });
      }
      
      // If userId is provided, verify the user exists
      let userInfo = null;
      if (userId && req.authUser) {
        userInfo = await storage.getUserById(userId);
        
        if (!userInfo) {
          return res.status(404).json({ message: 'User not found' });
        }
      }
      
      // Build previous messages if this is an ongoing conversation
      let previousMessages: ChatMessage[] = [];
      
      if (sessionId) {
        // Get previous messages for this session
        const messages = await storage.getMessagesBySessionId(sessionId);
        
        if (messages && messages.length > 0) {
          previousMessages = messages.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          }));
        }
      }
      
      // Get knowledge context for the AI
      const knowledgeContext = await buildAIContext(message, tenantId);
      
      // Process the message with AI
      const response = await generateChatResponse(
        message,
        previousMessages,
        knowledgeContext,
        tenantId
      );
      
      // Store the conversation
      await storage.createMessage({
        ticketId: null,
        sessionId,
        role: 'user',
        content: message,
        metadata: {
          tenantId,
          userId: userInfo?.id || null,
          context: context || null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await storage.createMessage({
        ticketId: null,
        sessionId,
        role: 'assistant',
        content: response,
        metadata: {
          tenantId,
          userId: userInfo?.id || null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Return the AI response
      res.json({ 
        message: response,
        sessionId
      });
      
    } catch (error) {
      console.error('Error in authenticated chat:', error);
      res.status(500).json({ message: 'Failed to process message' });
    }
  });
}