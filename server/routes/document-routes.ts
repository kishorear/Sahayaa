import { Router, Request, Response, Express, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { storage } from "../storage";
import upload from "../upload";
import { extractTextFromFile, extractFileMetadata } from "../document-parser";
import fs from "fs";
import path from "path";

// This will be used when the module is imported
export function registerDocumentRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void
) {
  const router = Router();

// Get all documents
router.get(
  "/documents",
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const documents = await storage.getAllSupportDocuments(tenantId);
      res.json(documents);
    } catch (error) {
      console.error("Error getting documents:", error);
      res.status(500).json({ error: "Failed to retrieve documents" });
    }
  }
);

// Get document by ID
router.get(
  "/documents/:id",
  param("id").isInt().toInt(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const documentId = parseInt(req.params.id, 10);
      const document = await storage.getSupportDocumentById(documentId, tenantId);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error getting document:", error);
      res.status(500).json({ error: "Failed to retrieve document" });
    }
  }
);

// Create a new document
router.post(
  "/documents",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("content").notEmpty().withMessage("Content is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("status")
      .isIn(["draft", "published", "archived"])
      .withMessage("Status must be either 'draft', 'published', or 'archived'"),
    body("summary").optional({ nullable: true }),
    body("tags").optional({ nullable: true }),
    body("errorCodes").optional({ nullable: true }),
    body("keywords").optional({ nullable: true })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const userId = req.user?.id;

      const documentData = {
        ...req.body,
        tenantId,
        createdBy: userId,
      };

      const newDocument = await storage.createSupportDocument(documentData);
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  }
);

// Update document
router.patch(
  "/documents/:id",
  param("id").isInt().toInt(),
  [
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("content").optional().notEmpty().withMessage("Content cannot be empty"),
    body("category").optional().notEmpty().withMessage("Category cannot be empty"),
    body("status")
      .optional()
      .isIn(["draft", "published", "archived"])
      .withMessage("Status must be either 'draft', 'published', or 'archived'"),
    body("summary").optional({ nullable: true }),
    body("tags").optional({ nullable: true }),
    body("errorCodes").optional({ nullable: true }),
    body("keywords").optional({ nullable: true })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const documentId = parseInt(req.params.id, 10);
      const userId = req.user?.id;

      // Check if document exists and belongs to this tenant
      const existingDocument = await storage.getSupportDocumentById(documentId, tenantId);
      if (!existingDocument) {
        return res.status(404).json({ error: "Document not found" });
      }

      // If status changes to "published", set publishedAt date
      const updates = { ...req.body };
      if (updates.status === "published" && existingDocument.status !== "published") {
        updates.publishedAt = new Date();
      }

      // Add who last edited the document
      updates.lastEditedBy = userId;

      const updatedDocument = await storage.updateSupportDocument(documentId, updates, tenantId);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  }
);

// Delete document
router.delete(
  "/documents/:id",
  param("id").isInt().toInt(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const documentId = parseInt(req.params.id, 10);

      // Check if document exists and belongs to this tenant
      const existingDocument = await storage.getSupportDocumentById(documentId, tenantId);
      if (!existingDocument) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.deleteSupportDocument(documentId, tenantId);
      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  }
);

// Get documents by category
router.get(
  "/documents/by-category/:category",
  param("category").notEmpty().withMessage("Category is required"),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const category = req.params.category;
      
      const documents = await storage.getSupportDocumentsByCategory(category, tenantId);
      res.json(documents);
    } catch (error) {
      console.error("Error getting documents by category:", error);
      res.status(500).json({ error: "Failed to retrieve documents" });
    }
  }
);

// Get documents by status
router.get(
  "/documents/by-status/:status",
  param("status")
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be either 'draft', 'published', or 'archived'"),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const status = req.params.status;
      
      const documents = await storage.getSupportDocumentsByStatus(status, tenantId);
      res.json(documents);
    } catch (error) {
      console.error("Error getting documents by status:", error);
      res.status(500).json({ error: "Failed to retrieve documents" });
    }
  }
);

// Document search by text query
router.get(
  "/documents/search",
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: "Search query parameter 'q' is required" });
      }
      
      const documents = await storage.searchSupportDocuments(query, tenantId);
      res.json(documents);
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ error: "Failed to search documents" });
    }
  }
);

// Track document view
router.post(
  "/documents/:id/track-view",
  param("id").isInt().toInt(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const documentId = parseInt(req.params.id, 10);
      
      await storage.incrementDocumentViewCount(documentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking document view:", error);
      res.status(500).json({ error: "Failed to track document view" });
    }
  }
);

// Upload document file
router.post(
  "/documents/upload",
  upload.single('file'),
  [
    body("category").notEmpty().withMessage("Category is required"),
    body("status")
      .isIn(["draft", "published", "archived"])
      .withMessage("Status must be either 'draft', 'published', or 'archived'"),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check if file was uploaded successfully
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Delete the uploaded file if validation fails
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ errors: errors.array() });
      }

      const tenantId = req.user?.tenantId || 1; // Default to 1 if not specified (temporary)
      const userId = req.user?.id;
      
      // Extract file content
      const fileContent = await extractTextFromFile(req.file.path);
      const metadata = extractFileMetadata(req.file.path);
      
      // Auto-generate title from filename if not provided
      const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));
      
      // Create document with extracted content and metadata
      // Ensure we have a valid userId, default to 1 if not present
      const createdBy = userId || 1;
      
      // Handle array fields properly - convert comma-separated strings to arrays if needed
      let tags: string[] = [];
      let errorCodes: string[] = [];
      let keywords: string[] = [];
      
      if (req.body.tags) {
        tags = typeof req.body.tags === 'string' ? req.body.tags.split(',').map((tag: string) => tag.trim()) : req.body.tags;
      }
      
      if (req.body.errorCodes) {
        errorCodes = typeof req.body.errorCodes === 'string' ? req.body.errorCodes.split(',').map((code: string) => code.trim()) : req.body.errorCodes;
      }
      
      if (req.body.keywords) {
        keywords = typeof req.body.keywords === 'string' ? req.body.keywords.split(',').map((keyword: string) => keyword.trim()) : req.body.keywords;
      }

      const documentData = {
        title: String(title),
        content: String(fileContent),
        category: String(req.body.category),
        status: String(req.body.status || 'draft'),
        summary: req.body.summary ? String(req.body.summary) : '',
        tags,
        errorCodes,
        keywords,
        tenantId,
        createdBy,
        metadata: {
          ...metadata,
          originalFilename: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date()
        }
      };

      const newDocument = await storage.createSupportDocument(documentData);
      
      // Return the created document
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Error uploading document:", error);
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to upload document" });
    }
  }
);

  // Register all routes under /api prefix
  app.use("/api", router);
  
  return router;
}

// No default export is needed anymore as we're exporting the registerDocumentRoutes function