import { Router, Request, Response, Express, NextFunction } from 'express';
import { storage } from '../storage';
import { insertUserFeedbackSchema } from '@shared/schema';
import { z } from 'zod';

// This will be used when the module is imported
export function registerFeedbackRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void
) {
  const router = Router();

  // Get all feedback for a tenant (admin only)
  router.get(
    '/feedback',
    requireAuth,
    requireRole(['admin', 'support']),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || 0;
        const feedbacks = await storage.getUserFeedback(tenantId);
        res.json(feedbacks);
      } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ error: 'Failed to fetch user feedback' });
      }
    }
  );

  // Get analytics for user feedback
  router.get(
    '/feedback/analytics',
    requireAuth,
    requireRole(['admin', 'support']),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user?.tenantId || 0;
        const analytics = await storage.getUserFeedbackAnalytics(tenantId);
        res.json(analytics);
      } catch (error) {
        console.error('Error fetching user feedback analytics:', error);
        res.status(500).json({ error: 'Failed to fetch user feedback analytics' });
      }
    }
  );

  // Get specific feedback by ID
  router.get(
    '/feedback/:id',
    requireAuth,
    requireRole(['admin', 'support']),
    async (req: Request, res: Response) => {
      try {
        const feedbackId = parseInt(req.params.id);
        if (isNaN(feedbackId)) {
          return res.status(400).json({ error: 'Invalid feedback ID' });
        }
        
        const feedback = await storage.getUserFeedbackById(feedbackId);
        if (!feedback) {
          return res.status(404).json({ error: 'Feedback not found' });
        }
        
        // Make sure the user can only see feedback from their tenant
        if (feedback.tenantId !== req.user?.tenantId) {
          return res.status(403).json({ error: 'Not authorized to view this feedback' });
        }
        
        res.json(feedback);
      } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ error: 'Failed to fetch user feedback' });
      }
    }
  );

  // Create new feedback (public API - no auth required)
  router.post(
    '/feedback',
    async (req: Request, res: Response) => {
      try {
        // Validate the request body manually
        const result = insertUserFeedbackSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ errors: result.error.errors });
        }
        
        const newFeedback = await storage.createUserFeedback(req.body);
        res.status(201).json(newFeedback);
      } catch (error) {
        console.error('Error creating user feedback:', error);
        res.status(500).json({ error: 'Failed to create user feedback' });
      }
    }
  );

  // Resolve feedback (admin/support only)
  router.patch(
    '/feedback/:id/resolve',
    requireAuth,
    requireRole(['admin', 'support']),
    async (req: Request, res: Response) => {
      try {
        const feedbackId = parseInt(req.params.id);
        if (isNaN(feedbackId)) {
          return res.status(400).json({ error: 'Invalid feedback ID' });
        }
        
        // First check if the feedback exists and belongs to this tenant
        const existingFeedback = await storage.getUserFeedbackById(feedbackId);
        if (!existingFeedback) {
          return res.status(404).json({ error: 'Feedback not found' });
        }
        
        if (existingFeedback.tenantId !== req.user?.tenantId) {
          return res.status(403).json({ error: 'Not authorized to resolve this feedback' });
        }
        
        const resolvedFeedback = await storage.resolveUserFeedback(feedbackId, req.user.id);
        res.json(resolvedFeedback);
      } catch (error) {
        console.error('Error resolving user feedback:', error);
        res.status(500).json({ error: 'Failed to resolve user feedback' });
      }
    }
  );

  // Register all routes under /api prefix
  app.use('/api', router);
  
  return router;
}