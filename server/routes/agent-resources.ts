import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { storage } from '../storage';

const router = express.Router();

// Simple authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Agent configuration with file type restrictions
const AGENT_CONFIGS = {
  'chat-preprocessor': {
    name: 'Chat Preprocessor Agent',
    allowedTypes: ['.txt', '.md', '.json'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  'instruction-lookup': {
    name: 'Instruction Lookup Agent',
    allowedTypes: ['.txt', '.pdf', '.docx', '.pptx', '.xlsx'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  'ticket-lookup': {
    name: 'Ticket Lookup Agent',
    allowedTypes: [], // No uploads allowed
    maxFileSize: 0,
    disabled: true
  },
  'ticket-formatter': {
    name: 'Ticket Formatter Agent',
    allowedTypes: ['.txt', '.md', '.json', '.html'],
    maxFileSize: 2 * 1024 * 1024, // 2MB
  }
};

// Configure multer for file uploads with agent-specific directories
const storage_config = multer.diskStorage({
  destination: async (req, file, cb) => {
    const agentType = req.body.agent_type;
    const tenantId = req.user?.tenantId || 1;
    
    // Create agent-specific directory structure
    const uploadDir = path.join(process.cwd(), 'uploads', 'agent-resources', `tenant-${tenantId}`, agentType);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  }
});

// File filter for validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const agentType = req.body.agent_type;
  const config = AGENT_CONFIGS[agentType as keyof typeof AGENT_CONFIGS];
  
  if (!config) {
    return cb(new Error('Invalid agent type'));
  }
  
  if (config.disabled) {
    return cb(new Error('This agent does not accept file uploads'));
  }
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!config.allowedTypes.includes(fileExtension)) {
    return cb(new Error(`File type ${fileExtension} not allowed for this agent. Allowed types: ${config.allowedTypes.join(', ')}`));
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage_config,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max (will be checked per agent)
  }
});

// GET /api/agent-resources - Get resources for specific agent
router.get('/', requireAuth, async (req, res) => {
  try {
    const { agent } = req.query;
    const tenantId = req.user?.tenantId || 1;
    
    if (!agent || typeof agent !== 'string') {
      return res.status(400).json({ error: 'Agent type is required' });
    }
    
    if (!AGENT_CONFIGS[agent as keyof typeof AGENT_CONFIGS]) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    const resources = await storage.getAgentResources(agent, tenantId);
    res.json(resources);
  } catch (error) {
    console.error('Error fetching agent resources:', error);
    res.status(500).json({ error: 'Failed to fetch agent resources' });
  }
});

// POST /api/agent-resources/upload - Upload file for specific agent
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { agent_type } = req.body;
    const file = req.file;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId || 1;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!agent_type) {
      return res.status(400).json({ error: 'Agent type is required' });
    }
    
    const config = AGENT_CONFIGS[agent_type as keyof typeof AGENT_CONFIGS];
    if (!config) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    if (config.disabled) {
      return res.status(400).json({ error: 'This agent does not accept file uploads' });
    }
    
    // Validate file size per agent
    if (file.size > config.maxFileSize) {
      // Clean up uploaded file
      await fs.unlink(file.path);
      return res.status(400).json({ 
        error: `File size exceeds limit for this agent (${Math.round(config.maxFileSize / 1024 / 1024)}MB)` 
      });
    }
    
    // Store file information in database
    const resourceData = {
      agentType: agent_type,
      filename: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      fileType: path.extname(file.originalname).toLowerCase(),
      filePath: file.path,
      tenantId,
      uploadedBy: userId!,
      metadata: {
        mimetype: file.mimetype,
        encoding: file.encoding
      }
    };
    
    const resource = await storage.createAgentResource(resourceData);
    
    res.status(201).json({
      message: 'File uploaded successfully',
      resource: {
        id: resource.id,
        agent_type: resource.agentType,
        filename: resource.filename,
        original_name: resource.originalName,
        file_size: resource.fileSize,
        file_type: resource.fileType,
        upload_date: resource.uploadDate,
        tenant_id: resource.tenantId,
        uploaded_by: resource.uploadedBy
      }
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    
    // Clean up file if it was uploaded but database operation failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// GET /api/agent-resources/:id/download - Download specific resource
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    const tenantId = req.user?.tenantId || 1;
    
    if (isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }
    
    const resource = await storage.getAgentResource(resourceId, tenantId);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Check if file exists
    try {
      await fs.access(resource.filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${resource.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    res.sendFile(path.resolve(resource.filePath));
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /api/agent-resources/:id - Delete specific resource
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    const tenantId = req.user?.tenantId || 1;
    
    if (isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }
    
    const resource = await storage.getAgentResource(resourceId, tenantId);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Delete file from disk
    try {
      await fs.unlink(resource.filePath);
    } catch (error) {
      console.error('Error deleting file from disk:', error);
      // Continue with database deletion even if file deletion fails
    }
    
    // Delete from database
    await storage.deleteAgentResource(resourceId, tenantId);
    
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;