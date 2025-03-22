import { Request, Response } from "express";
import { Express } from "express";
import { storage } from "../storage";
import { insertDataSourceSchema, User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function registerDataSourceRoutes(app: Express, requireAuth: any) {
  // Get all data sources
  app.get('/api/data-sources', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if the user is an admin to access all data sources
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access to data sources' });
      }
      
      // Get tenant-specific data sources if tenant is defined, otherwise get all
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const dataSources = await storage.getAllDataSources(tenantId);
      return res.status(200).json(dataSources);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      return res.status(500).json({ error: 'Failed to fetch data sources' });
    }
  });

  // Get enabled data sources
  app.get('/api/data-sources/enabled', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get tenant-specific data sources
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const dataSources = await storage.getEnabledDataSources(tenantId);
      return res.status(200).json(dataSources);
    } catch (error) {
      console.error('Error fetching enabled data sources:', error);
      return res.status(500).json({ error: 'Failed to fetch enabled data sources' });
    }
  });

  // Get a specific data source
  app.get('/api/data-sources/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if the user is an admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access to data source' });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid data source ID' });
      }
      
      // Get tenant-specific data source
      const tenantId = req.tenant?.id || req.user?.tenantId;
      const dataSource = await storage.getDataSourceById(id, tenantId);
      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      
      return res.status(200).json(dataSource);
    } catch (error) {
      console.error('Error fetching data source:', error);
      return res.status(500).json({ error: 'Failed to fetch data source' });
    }
  });

  // Create a new data source
  app.post('/api/data-sources', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if the user is an admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to create data sources' });
      }
      
      // Validate request body
      const validData = insertDataSourceSchema.parse(req.body);
      
      // Get tenant-specific context
      const tenantId = req.tenant?.id || req.user?.tenantId;
      
      // Add tenant ID to the data source
      if (tenantId) {
        validData.tenantId = tenantId;
      }
      
      // Create the data source
      const dataSource = await storage.createDataSource(validData);
      return res.status(201).json(dataSource);
    } catch (error) {
      console.error('Error creating data source:', error);
      
      // Handle validation errors
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      return res.status(500).json({ error: 'Failed to create data source' });
    }
  });

  // Update a data source
  app.patch('/api/data-sources/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if the user is an admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to update data sources' });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid data source ID' });
      }
      
      // Get tenant-specific context
      const tenantId = req.tenant?.id || req.user?.tenantId;
      
      // Check if data source exists
      const existingDataSource = await storage.getDataSourceById(id, tenantId);
      if (!existingDataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      
      // Partial validation for updates
      const updates = req.body;
      
      // Update the data source
      const updatedDataSource = await storage.updateDataSource(id, updates, tenantId);
      return res.status(200).json(updatedDataSource);
    } catch (error) {
      console.error('Error updating data source:', error);
      return res.status(500).json({ error: 'Failed to update data source' });
    }
  });

  // Delete a data source
  app.delete('/api/data-sources/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if the user is an admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to delete data sources' });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid data source ID' });
      }
      
      // Get tenant-specific context
      const tenantId = req.tenant?.id || req.user?.tenantId;
      
      // Check if data source exists
      const existingDataSource = await storage.getDataSourceById(id, tenantId);
      if (!existingDataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      
      // Delete the data source
      const success = await storage.deleteDataSource(id, tenantId);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete data source' });
      }
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting data source:', error);
      return res.status(500).json({ error: 'Failed to delete data source' });
    }
  });
}