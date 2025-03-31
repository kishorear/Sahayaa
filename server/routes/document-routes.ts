import express from 'express';
import { storage } from '../storage';
import type { Express, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { InsertSupportDocument } from '@shared/schema';

// Function to register document routes
export function registerDocumentRoutes(app: Express, requireAuth: any, requireRole: any) {
  const router = express.Router();

// Get all documents (with optional tenant filtering)
router.get('/documents', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const documents = await storage.getAllSupportDocuments(tenantId);
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Get documents by category
router.get('/documents/category/:category', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const tenantId = req.user?.tenantId;
    const documents = await storage.getSupportDocumentsByCategory(category, tenantId);
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error getting documents by category:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Get documents by status
router.get('/documents/status/:status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const tenantId = req.user?.tenantId;
    const documents = await storage.getSupportDocumentsByStatus(status, tenantId);
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error getting documents by status:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Search documents
router.get('/documents/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { query: searchQuery } = req.query;
    const tenantId = req.user?.tenantId;
    
    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({ error: 'Search query parameter is required' });
    }
    
    const documents = await storage.searchSupportDocuments(searchQuery, tenantId);
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// Get a specific document by ID
router.get('/documents/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const tenantId = req.user?.tenantId;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await storage.getSupportDocumentById(id, tenantId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Increment the view count when retrieving a document
    await storage.incrementDocumentViewCount(id);
    
    res.status(200).json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

// Create a new document
router.post('/documents', 
  requireAuth, 
  requireRole(['admin', 'support']),
  [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('content').isString().notEmpty().withMessage('Content is required'),
    body('category').isString().notEmpty().withMessage('Category is required'),
    body('status').isIn(['draft', 'published', 'archived']).withMessage('Status must be draft, published, or archived'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }
      
      const documentData: InsertSupportDocument = {
        ...req.body,
        tenantId,
        createdBy: userId,
      };
      
      const newDocument = await storage.createSupportDocument(documentData);
      res.status(201).json(newDocument);
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  }
);

// Update a document
router.patch('/documents/:id', 
  requireAuth, 
  requireRole(['admin', 'support']),
  [
    param('id').isInt().withMessage('Invalid document ID'),
    body('title').optional().isString().notEmpty().withMessage('Title cannot be empty'),
    body('content').optional().isString().notEmpty().withMessage('Content cannot be empty'),
    body('category').optional().isString().notEmpty().withMessage('Category cannot be empty'),
    body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Status must be draft, published, or archived'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      const document = await storage.getSupportDocumentById(id, tenantId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Add lastEditedBy field to track who made the update
      const updates = {
        ...req.body,
        lastEditedBy: userId,
        // Set publishedAt timestamp if status is being changed to published
        ...(req.body.status === 'published' && document.status !== 'published' && {
          publishedAt: new Date()
        })
      };
      
      const updatedDocument = await storage.updateSupportDocument(id, updates, tenantId);
      res.status(200).json(updatedDocument);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }
);

// Delete a document
router.delete('/documents/:id', 
  requireAuth, 
  requireRole(['admin']), // Only admins can delete documents
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      const document = await storage.getSupportDocumentById(id, tenantId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const result = await storage.deleteSupportDocument(id, tenantId);
      
      if (result) {
        res.status(200).json({ success: true, message: 'Document deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to delete document' });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

// Get document usage analytics
router.get('/documents/analytics',
  requireAuth,
  requireRole(['admin']), // Only admins can view analytics
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      // Default to last 30 days if not specified
      const endDate = endDateParam ? new Date(endDateParam) : new Date();
      const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days ago
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      
      const analytics = await storage.getDocumentUsageAnalytics(startDate, endDate, tenantId);
      res.status(200).json(analytics);
    } catch (error) {
      console.error('Error getting document analytics:', error);
      res.status(500).json({ error: 'Failed to retrieve document analytics' });
    }
  }
);

  // Register routes with the main app
  app.use('/api', router);
}

// Note: We're not exporting the router directly as it's only accessible within the function scope