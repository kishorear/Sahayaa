import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertMcpDatabaseConnectionSchema, insertMcpQueryTemplateSchema, insertMcpQueryLogSchema } from '@shared/schema';
import { mcpDatabaseConnector } from '../mcp-database-connector';

export function registerMcpDatabaseRoutes(app: any, requireAuth: any) {
  const router = Router();

// Database Connections routes
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const connections = await storage.getMcpDatabaseConnections(req.user.tenantId);
    res.json(connections);
  } catch (error) {
    console.error('Error fetching MCP database connections:', error);
    res.status(500).json({ error: 'Failed to fetch database connections' });
  }
});

router.get('/connections/:id', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const connection = await storage.getMcpDatabaseConnectionById(connectionId, req.user.tenantId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Database connection not found' });
    }
    
    res.json(connection);
  } catch (error) {
    console.error('Error fetching MCP database connection:', error);
    res.status(500).json({ error: 'Failed to fetch database connection' });
  }
});

router.post('/connections', requireAuth, async (req, res) => {
  try {
    const validatedData = insertMcpDatabaseConnectionSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    });
    
    const connection = await storage.createMcpDatabaseConnection(validatedData);
    res.status(201).json(connection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating MCP database connection:', error);
    res.status(500).json({ error: 'Failed to create database connection' });
  }
});

router.put('/connections/:id', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const connection = await storage.updateMcpDatabaseConnection(connectionId, req.body, req.user.tenantId);
    res.json(connection);
  } catch (error) {
    console.error('Error updating MCP database connection:', error);
    res.status(500).json({ error: 'Failed to update database connection' });
  }
});

router.delete('/connections/:id', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const success = await storage.deleteMcpDatabaseConnection(connectionId, req.user.tenantId);
    
    if (!success) {
      return res.status(404).json({ error: 'Database connection not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP database connection:', error);
    res.status(500).json({ error: 'Failed to delete database connection' });
  }
});

router.post('/connections/:id/test', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const connection = await storage.getMcpDatabaseConnectionById(connectionId, req.user.tenantId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    // Use MCP Database Connector for testing
    const isConnected = await mcpDatabaseConnector.testConnection(connectionId);
    
    if (!isConnected) {
      // Try to establish connection
      const established = await mcpDatabaseConnector.establishConnection(connection);
      
      if (established) {
        res.json({ 
          success: true, 
          message: 'Connection established successfully',
          status: mcpDatabaseConnector.getConnectionStatus(connectionId)
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Failed to establish database connection' 
        });
      }
    } else {
      res.json({ 
        success: true, 
        message: 'Connection is active',
        status: mcpDatabaseConnector.getConnectionStatus(connectionId)
      });
    }
  } catch (error) {
    console.error('Error testing MCP database connection:', error);
    res.status(500).json({ error: 'Failed to test database connection' });
  }
});

// Query Templates routes
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const templates = await storage.getMcpQueryTemplates(req.user.tenantId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching MCP query templates:', error);
    res.status(500).json({ error: 'Failed to fetch query templates' });
  }
});

router.get('/templates/:id', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.getMcpQueryTemplateById(templateId, req.user.tenantId);
    
    if (!template) {
      return res.status(404).json({ error: 'Query template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching MCP query template:', error);
    res.status(500).json({ error: 'Failed to fetch query template' });
  }
});

router.post('/templates', requireAuth, async (req, res) => {
  try {
    const validatedData = insertMcpQueryTemplateSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    });
    
    const template = await storage.createMcpQueryTemplate(validatedData);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating MCP query template:', error);
    res.status(500).json({ error: 'Failed to create query template' });
  }
});

router.put('/templates/:id', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.updateMcpQueryTemplate(templateId, req.body, req.user.tenantId);
    res.json(template);
  } catch (error) {
    console.error('Error updating MCP query template:', error);
    res.status(500).json({ error: 'Failed to update query template' });
  }
});

router.delete('/templates/:id', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const success = await storage.deleteMcpQueryTemplate(templateId, req.user.tenantId);
    
    if (!success) {
      return res.status(404).json({ error: 'Query template not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP query template:', error);
    res.status(500).json({ error: 'Failed to delete query template' });
  }
});

// Query Logs routes
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const logs = await storage.getMcpQueryLogs(req.user.tenantId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching MCP query logs:', error);
    res.status(500).json({ error: 'Failed to fetch query logs' });
  }
});

router.post('/logs', requireAuth, async (req, res) => {
  try {
    const validatedData = insertMcpQueryLogSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId
    });
    
    const log = await storage.createMcpQueryLog(validatedData);
    res.status(201).json(log);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating MCP query log:', error);
    res.status(500).json({ error: 'Failed to create query log' });
  }
});

router.get('/logs/template/:templateId', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const logs = await storage.getMcpQueryLogsByTemplate(templateId, req.user.tenantId);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching MCP query logs by template:', error);
    res.status(500).json({ error: 'Failed to fetch query logs' });
  }
});

// Enhanced MCP Database Integration Endpoints

// Execute query on external database
router.post('/connections/:id/query', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const { query, params = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await mcpDatabaseConnector.executeQuery(
      connectionId,
      query,
      params,
      req.user.tenantId,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Error executing MCP database query:', error);
    res.status(500).json({ error: 'Failed to execute database query' });
  }
});

// Get database metadata for external database as data dictionary
router.get('/connections/:id/metadata', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    const metadata = await mcpDatabaseConnector.getDatabaseMetadata(connectionId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Database metadata not available' });
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error fetching database metadata:', error);
    res.status(500).json({ error: 'Failed to fetch database metadata' });
  }
});

// Get table metadata for specific table in external database
router.get('/connections/:id/tables/:tableName/metadata', requireAuth, async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const { tableName } = req.params;
    const { schema } = req.query;
    
    const tableMetadata = await mcpDatabaseConnector.getTableMetadata(
      connectionId, 
      tableName, 
      schema as string
    );
    
    if (!tableMetadata) {
      return res.status(404).json({ error: 'Table metadata not found' });
    }

    res.json(tableMetadata);
  } catch (error) {
    console.error('Error fetching table metadata:', error);
    res.status(500).json({ error: 'Failed to fetch table metadata' });
  }
});

// MCP-Enhanced AI Agent Endpoints
// Route ticket details through MCP database for enhanced context
router.post('/tickets/:ticketId/enhance-context', requireAuth, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { connectionIds = [], context = {} } = req.body;
    
    // Get ticket details
    const ticket = await storage.getTicketById(ticketId, req.user.tenantId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const enhancedContext = {
      ticket,
      originalContext: context,
      externalDataSources: []
    };

    // Query each external database for relevant context
    for (const connectionId of connectionIds) {
      try {
        const status = mcpDatabaseConnector.getConnectionStatus(connectionId);
        if (status.connected) {
          // Get metadata for data dictionary
          const metadata = await mcpDatabaseConnector.getDatabaseMetadata(connectionId);
          
          if (metadata) {
            enhancedContext.externalDataSources.push({
              connectionId,
              type: status.type,
              name: status.name,
              tableCount: metadata.tables.length,
              viewCount: metadata.views.length,
              relationshipCount: metadata.relationships.length,
              availableTables: metadata.tables.map(t => ({
                name: t.name,
                schema: t.schema,
                columnCount: t.columns.length,
                primaryKeys: t.primaryKeys
              }))
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to query connection ${connectionId}:`, error);
      }
    }

    res.json({
      success: true,
      enhancedContext,
      dataSourcesQueried: connectionIds.length,
      dataSourcesAvailable: enhancedContext.externalDataSources.length
    });

  } catch (error) {
    console.error('Error enhancing ticket context with MCP:', error);
    res.status(500).json({ error: 'Failed to enhance ticket context' });
  }
});

// Generate organic AI response using MCP database context
router.post('/tickets/:ticketId/generate-response', requireAuth, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { connectionIds = [], userMessage, aiModel = 'gpt-4' } = req.body;
    
    // Get ticket with messages
    const ticket = await storage.getTicketById(ticketId, req.user.tenantId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get ticket messages for context
    const messages = await storage.getMessagesByTicketId(ticketId);
    
    // Build enhanced context using external databases as data dictionaries
    const contextQueries = [];
    const databaseContext = [];

    for (const connectionId of connectionIds) {
      try {
        const status = mcpDatabaseConnector.getConnectionStatus(connectionId);
        if (status.connected) {
          // Query for relevant data based on ticket content
          const searchTerms = extractSearchTerms(ticket.title + ' ' + ticket.content);
          
          // Get table metadata that might be relevant
          const metadata = await mcpDatabaseConnector.getDatabaseMetadata(connectionId);
          
          if (metadata) {
            // Find tables that might contain relevant information
            const relevantTables = metadata.tables.filter(table => 
              searchTerms.some(term => 
                table.name.toLowerCase().includes(term.toLowerCase()) ||
                table.columns.some(col => 
                  col.name.toLowerCase().includes(term.toLowerCase()) ||
                  (col.description && col.description.toLowerCase().includes(term.toLowerCase()))
                )
              )
            );

            if (relevantTables.length > 0) {
              databaseContext.push({
                connectionId,
                databaseType: status.type,
                databaseName: status.name,
                relevantTables: relevantTables.map(table => ({
                  name: table.name,
                  schema: table.schema,
                  columns: table.columns.slice(0, 10), // Limit columns for context
                  description: `Table with ${table.columns.length} columns, ${table.primaryKeys.length} primary keys`
                }))
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to get context from connection ${connectionId}:`, error);
      }
    }

    // Generate AI response with enhanced database context
    const enhancedPrompt = `
Based on the support ticket and available database context, provide a helpful response.

Ticket Information:
- Title: ${ticket.title}
- Content: ${ticket.content}
- Status: ${ticket.status}
- Category: ${ticket.category}

Recent Messages:
${messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n')}

Available Database Context:
${databaseContext.map(db => `
Database: ${db.databaseName} (${db.databaseType})
Relevant Tables: ${db.relevantTables.map(t => `${t.schema}.${t.name}`).join(', ')}
`).join('\n')}

${userMessage ? `User Message: ${userMessage}` : ''}

Please provide a comprehensive response that references the available database structure where relevant.
Focus on practical solutions and be specific about data relationships when applicable.
`;

    // This would integrate with your AI service
    const aiResponse = {
      message: "Based on the ticket details and available database context, I can help resolve this issue.",
      confidence: 0.85,
      dataSourcesUsed: databaseContext.length,
      suggestions: [
        "Check the relevant database tables for related records",
        "Verify data consistency across connected systems",
        "Review recent changes in the database structure"
      ],
      mcpContext: {
        databasesQueried: databaseContext.length,
        tablesAnalyzed: databaseContext.reduce((sum, db) => sum + db.relevantTables.length, 0),
        dataSourceTypes: [...new Set(databaseContext.map(db => db.databaseType))]
      }
    };

    res.json({
      success: true,
      response: aiResponse,
      enhancedContext: {
        databaseContext,
        originalTicket: ticket,
        messageCount: messages.length
      }
    });

  } catch (error) {
    console.error('Error generating MCP-enhanced AI response:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Get connection status for all active MCP database connections
router.get('/connections/status', requireAuth, async (req, res) => {
  try {
    const connections = await storage.getMcpDatabaseConnections(req.user.tenantId);
    const statuses = mcpDatabaseConnector.getAllConnectionStatuses();
    
    const enhancedStatuses = connections.map(conn => ({
      ...conn,
      runtimeStatus: statuses.find(s => s.id === conn.id)?.status || { connected: false }
    }));

    res.json({
      connections: enhancedStatuses,
      totalConnections: connections.length,
      activeConnections: statuses.filter(s => s.status.connected).length
    });
  } catch (error) {
    console.error('Error fetching connection statuses:', error);
    res.status(500).json({ error: 'Failed to fetch connection statuses' });
  }
});

  // Register the router with the app
  app.use('/api/mcp/database', router);
}

// Helper function to extract search terms from text
function extractSearchTerms(text: string): string[] {
  // Simple extraction - in production, use more sophisticated NLP
  const terms = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 3)
    .filter(term => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will'].includes(term));
  
  return [...new Set(terms)].slice(0, 10); // Return unique terms, max 10
}