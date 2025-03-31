import { Router, Request, Response, Express, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { storage } from "../storage";

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

  // Register all routes under /api prefix
  app.use("/api", router);
  
  return router;
}

// No default export is needed anymore as we're exporting the registerDocumentRoutes function