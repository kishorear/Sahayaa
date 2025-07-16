import { 
  McpDatabaseConnection, 
  McpQueryTemplate, 
  McpQueryLog,
  InsertMcpDatabaseConnection,
  InsertMcpQueryTemplate,
  InsertMcpQueryLog 
} from "@shared/schema";
import { storage } from "./storage";
import mysql from "mysql2/promise";
import oracledb from "oracledb";

export interface DatabaseMetadata {
  tables: TableMetadata[];
  views: ViewMetadata[];
  relationships: RelationshipMetadata[];
}

export interface TableMetadata {
  name: string;
  schema: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  indexes: IndexMetadata[];
  rowCount?: number;
}

export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  description?: string;
}

export interface ViewMetadata {
  name: string;
  schema: string;
  definition: string;
  columns: ColumnMetadata[];
}

export interface RelationshipMetadata {
  name: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime: number;
  rowsAffected?: number;
  metadata?: {
    columns: Array<{
      name: string;
      type: string;
    }>;
  };
}

export class McpDatabaseConnector {
  private connections: Map<number, any> = new Map();
  
  constructor() {
    this.initializeConnections();
  }

  private async initializeConnections() {
    try {
      const connections = await storage.getMcpDatabaseConnections();
      for (const conn of connections) {
        if (conn.isActive) {
          await this.establishConnection(conn);
        }
      }
      console.log(`MCP Database Connector: Initialized ${this.connections.size} active connections`);
    } catch (error) {
      console.error("Failed to initialize MCP database connections:", error);
    }
  }

  async establishConnection(connectionConfig: McpDatabaseConnection): Promise<boolean> {
    try {
      let connection;
      
      switch (connectionConfig.type) {
        case 'mysql':
          connection = await this.createMySQLConnection(connectionConfig);
          break;
        case 'oracle':
          connection = await this.createOracleConnection(connectionConfig);
          break;
        case 'postgresql':
          connection = await this.createPostgreSQLConnection(connectionConfig);
          break;
        default:
          throw new Error(`Unsupported database type: ${connectionConfig.type}`);
      }

      if (connection) {
        this.connections.set(connectionConfig.id, {
          connection,
          config: connectionConfig,
          lastUsed: new Date(),
          queryCount: 0
        });

        // Update connection status
        await storage.updateMcpDatabaseConnection(connectionConfig.id, {
          lastTested: new Date(),
          testSuccess: true,
          errorMessage: null
        });

        console.log(`MCP Database: Established ${connectionConfig.type} connection for ${connectionConfig.name}`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to establish connection for ${connectionConfig.name}:`, error);
      
      // Update connection status with error
      await storage.updateMcpDatabaseConnection(connectionConfig.id, {
        lastTested: new Date(),
        testSuccess: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
    return false;
  }

  private async createMySQLConnection(config: McpDatabaseConnection) {
    const connectionString = config.connectionString || '';
    const url = new URL(connectionString);
    
    const connection = await mysql.createConnection({
      host: config.host || url.hostname,
      port: config.port || parseInt(url.port) || 3306,
      user: config.username || url.username,
      password: config.password || url.password,
      database: config.database || url.pathname.slice(1),
      ssl: config.sslConfig ? JSON.parse(config.sslConfig) : false,
      connectTimeout: 30000,
      acquireTimeout: 30000
    });

    // Test the connection
    await connection.ping();
    return connection;
  }

  private async createOracleConnection(config: McpDatabaseConnection) {
    const connectionString = config.connectionString || 
      `${config.host}:${config.port}/${config.database}`;
    
    const connection = await oracledb.getConnection({
      user: config.username,
      password: config.password,
      connectString: connectionString,
      poolAlias: `mcp_${config.id}`,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1
    });

    return connection;
  }

  private async createPostgreSQLConnection(config: McpDatabaseConnection) {
    // For PostgreSQL, we'll use the existing database connection from our main app
    // This is more for completeness and testing purposes
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.sslConfig ? JSON.parse(config.sslConfig) : false
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    return pool;
  }

  async executeQuery(
    connectionId: number, 
    query: string, 
    params: any[] = [],
    tenantId: number,
    userId: number
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const connInfo = this.connections.get(connectionId);
    
    if (!connInfo) {
      return {
        success: false,
        error: 'Database connection not found or inactive',
        executionTime: Date.now() - startTime
      };
    }

    try {
      let result;
      const { connection, config } = connInfo;

      // Update connection usage
      connInfo.lastUsed = new Date();
      connInfo.queryCount++;

      switch (config.type) {
        case 'mysql':
          result = await this.executeMySQLQuery(connection, query, params);
          break;
        case 'oracle':
          result = await this.executeOracleQuery(connection, query, params);
          break;
        case 'postgresql':
          result = await this.executePostgreSQLQuery(connection, query, params);
          break;
        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      const executionTime = Date.now() - startTime;

      // Log the query execution
      await this.logQuery({
        connectionId,
        tenantId,
        userId,
        query,
        params: JSON.stringify(params),
        success: true,
        executionTime,
        rowsAffected: result.rowsAffected,
        metadata: JSON.stringify(result.metadata)
      });

      return {
        success: true,
        data: result.data,
        executionTime,
        rowsAffected: result.rowsAffected,
        metadata: result.metadata
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed query
      await this.logQuery({
        connectionId,
        tenantId,
        userId,
        query,
        params: JSON.stringify(params),
        success: false,
        executionTime,
        errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  private async executeMySQLQuery(connection: any, query: string, params: any[]) {
    const [rows, fields] = await connection.execute(query, params);
    
    return {
      data: Array.isArray(rows) ? rows : [rows],
      rowsAffected: (rows as any).affectedRows || (Array.isArray(rows) ? rows.length : 0),
      metadata: {
        columns: fields?.map((field: any) => ({
          name: field.name,
          type: field.type
        })) || []
      }
    };
  }

  private async executeOracleQuery(connection: any, query: string, params: any[]) {
    const result = await connection.execute(query, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    
    return {
      data: result.rows || [],
      rowsAffected: result.rowsAffected || 0,
      metadata: {
        columns: result.metaData?.map((col: any) => ({
          name: col.name,
          type: col.typeName || col.dbType
        })) || []
      }
    };
  }

  private async executePostgreSQLQuery(connection: any, query: string, params: any[]) {
    const result = await connection.query(query, params);
    
    return {
      data: result.rows || [],
      rowsAffected: result.rowCount || 0,
      metadata: {
        columns: result.fields?.map((field: any) => ({
          name: field.name,
          type: field.dataTypeID
        })) || []
      }
    };
  }

  async getTableMetadata(connectionId: number, tableName: string, schema?: string): Promise<TableMetadata | null> {
    const connInfo = this.connections.get(connectionId);
    if (!connInfo) return null;

    const { config } = connInfo;

    try {
      switch (config.type) {
        case 'mysql':
          return await this.getMySQLTableMetadata(connectionId, tableName, schema);
        case 'oracle':
          return await this.getOracleTableMetadata(connectionId, tableName, schema);
        case 'postgresql':
          return await this.getPostgreSQLTableMetadata(connectionId, tableName, schema);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to get table metadata for ${tableName}:`, error);
      return null;
    }
  }

  private async getMySQLTableMetadata(connectionId: number, tableName: string, schema?: string): Promise<TableMetadata> {
    const dbName = schema || this.connections.get(connectionId)?.config.database || 'information_schema';
    
    // Get column information
    const columnsQuery = `
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as dataType,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        CHARACTER_MAXIMUM_LENGTH as maxLength,
        NUMERIC_PRECISION as precision,
        NUMERIC_SCALE as scale,
        COLUMN_COMMENT as description
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
    
    const columnsResult = await this.executeQuery(connectionId, columnsQuery, [dbName, tableName], 1, 1);
    
    // Get primary keys
    const pkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
    `;
    
    const pkResult = await this.executeQuery(connectionId, pkQuery, [dbName, tableName], 1, 1);
    
    // Get indexes
    const indexQuery = `
      SELECT 
        INDEX_NAME as name,
        COLUMN_NAME as columnName,
        NON_UNIQUE = 0 as isUnique,
        INDEX_TYPE as type
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;
    
    const indexResult = await this.executeQuery(connectionId, indexQuery, [dbName, tableName], 1, 1);
    
    return {
      name: tableName,
      schema: dbName,
      columns: columnsResult.data?.map((col: any) => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable === 'YES',
        defaultValue: col.defaultValue,
        maxLength: col.maxLength,
        precision: col.precision,
        scale: col.scale,
        description: col.description
      })) || [],
      primaryKeys: pkResult.data?.map((pk: any) => pk.COLUMN_NAME) || [],
      indexes: this.groupIndexes(indexResult.data || [])
    };
  }

  private async getOracleTableMetadata(connectionId: number, tableName: string, schema?: string): Promise<TableMetadata> {
    const ownerName = schema || this.connections.get(connectionId)?.config.username?.toUpperCase();
    
    // Get column information
    const columnsQuery = `
      SELECT 
        COLUMN_NAME as "name",
        DATA_TYPE as "dataType",
        NULLABLE as "nullable",
        DATA_DEFAULT as "defaultValue",
        DATA_LENGTH as "maxLength",
        DATA_PRECISION as "precision",
        DATA_SCALE as "scale"
      FROM ALL_TAB_COLUMNS 
      WHERE OWNER = :schema AND TABLE_NAME = :tableName
      ORDER BY COLUMN_ID
    `;
    
    const columnsResult = await this.executeQuery(connectionId, columnsQuery, [ownerName, tableName.toUpperCase()], 1, 1);
    
    // Get primary keys
    const pkQuery = `
      SELECT cc.COLUMN_NAME
      FROM ALL_CONSTRAINTS c, ALL_CONS_COLUMNS cc
      WHERE c.OWNER = :schema 
        AND c.TABLE_NAME = :tableName
        AND c.CONSTRAINT_TYPE = 'P'
        AND c.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
        AND c.OWNER = cc.OWNER
    `;
    
    const pkResult = await this.executeQuery(connectionId, pkQuery, [ownerName, tableName.toUpperCase()], 1, 1);
    
    return {
      name: tableName,
      schema: ownerName || '',
      columns: columnsResult.data?.map((col: any) => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable === 'Y',
        defaultValue: col.defaultValue,
        maxLength: col.maxLength,
        precision: col.precision,
        scale: col.scale
      })) || [],
      primaryKeys: pkResult.data?.map((pk: any) => pk.COLUMN_NAME) || [],
      indexes: []
    };
  }

  private async getPostgreSQLTableMetadata(connectionId: number, tableName: string, schema?: string): Promise<TableMetadata> {
    const schemaName = schema || 'public';
    
    // Get column information
    const columnsQuery = `
      SELECT 
        column_name as name,
        data_type as "dataType",
        is_nullable as nullable,
        column_default as "defaultValue",
        character_maximum_length as "maxLength",
        numeric_precision as precision,
        numeric_scale as scale
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await this.executeQuery(connectionId, columnsQuery, [schemaName, tableName], 1, 1);
    
    return {
      name: tableName,
      schema: schemaName,
      columns: columnsResult.data?.map((col: any) => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable === 'YES',
        defaultValue: col.defaultValue,
        maxLength: col.maxLength,
        precision: col.precision,
        scale: col.scale
      })) || [],
      primaryKeys: [],
      indexes: []
    };
  }

  private groupIndexes(indexData: any[]): IndexMetadata[] {
    const indexMap = new Map<string, IndexMetadata>();
    
    indexData.forEach(row => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          columns: [],
          unique: row.isUnique || false,
          type: row.type || 'BTREE'
        });
      }
      indexMap.get(row.name)!.columns.push(row.columnName);
    });
    
    return Array.from(indexMap.values());
  }

  async getDatabaseMetadata(connectionId: number): Promise<DatabaseMetadata | null> {
    const connInfo = this.connections.get(connectionId);
    if (!connInfo) return null;

    try {
      const tables = await this.getAllTables(connectionId);
      const views = await this.getAllViews(connectionId);
      const relationships = await this.getAllRelationships(connectionId);

      return {
        tables,
        views,
        relationships
      };
    } catch (error) {
      console.error(`Failed to get database metadata:`, error);
      return null;
    }
  }

  private async getAllTables(connectionId: number): Promise<TableMetadata[]> {
    const connInfo = this.connections.get(connectionId);
    if (!connInfo) return [];

    const { config } = connInfo;
    let query = '';
    let params: any[] = [];

    switch (config.type) {
      case 'mysql':
        query = `
          SELECT TABLE_NAME as name, TABLE_SCHEMA as schema
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        `;
        params = [config.database];
        break;
      case 'oracle':
        query = `
          SELECT TABLE_NAME as "name", OWNER as "schema"
          FROM ALL_TABLES 
          WHERE OWNER = :schema
        `;
        params = [config.username?.toUpperCase()];
        break;
      case 'postgresql':
        query = `
          SELECT table_name as name, table_schema as schema
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_type = 'BASE TABLE'
        `;
        params = [config.schema || 'public'];
        break;
    }

    const result = await this.executeQuery(connectionId, query, params, 1, 1);
    const tables: TableMetadata[] = [];

    if (result.success && result.data) {
      for (const row of result.data.slice(0, 50)) { // Limit to first 50 tables
        const tableMetadata = await this.getTableMetadata(connectionId, row.name, row.schema);
        if (tableMetadata) {
          tables.push(tableMetadata);
        }
      }
    }

    return tables;
  }

  private async getAllViews(connectionId: number): Promise<ViewMetadata[]> {
    // Implementation for getting all views - simplified for now
    return [];
  }

  private async getAllRelationships(connectionId: number): Promise<RelationshipMetadata[]> {
    // Implementation for getting foreign key relationships - simplified for now
    return [];
  }

  private async logQuery(logData: Partial<InsertMcpQueryLog>) {
    try {
      await storage.createMcpQueryLog({
        connectionId: logData.connectionId!,
        tenantId: logData.tenantId!,
        userId: logData.userId!,
        query: logData.query!,
        params: logData.params,
        success: logData.success!,
        executionTime: logData.executionTime!,
        rowsAffected: logData.rowsAffected,
        errorMessage: logData.errorMessage,
        metadata: logData.metadata
      });
    } catch (error) {
      console.error('Failed to log MCP query:', error);
    }
  }

  async testConnection(connectionId: number): Promise<boolean> {
    try {
      const result = await this.executeQuery(connectionId, 'SELECT 1', [], 1, 1);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  async closeConnection(connectionId: number): Promise<void> {
    const connInfo = this.connections.get(connectionId);
    if (connInfo) {
      try {
        const { connection, config } = connInfo;
        
        switch (config.type) {
          case 'mysql':
            await connection.end();
            break;
          case 'oracle':
            await connection.close();
            break;
          case 'postgresql':
            await connection.end();
            break;
        }
        
        this.connections.delete(connectionId);
        console.log(`MCP Database: Closed connection for ${config.name}`);
      } catch (error) {
        console.error(`Failed to close connection ${connectionId}:`, error);
      }
    }
  }

  async refreshConnection(connectionId: number): Promise<boolean> {
    const connInfo = this.connections.get(connectionId);
    if (connInfo) {
      await this.closeConnection(connectionId);
      return await this.establishConnection(connInfo.config);
    }
    return false;
  }

  getConnectionStatus(connectionId: number) {
    const connInfo = this.connections.get(connectionId);
    if (!connInfo) {
      return { connected: false };
    }

    return {
      connected: true,
      lastUsed: connInfo.lastUsed,
      queryCount: connInfo.queryCount,
      type: connInfo.config.type,
      name: connInfo.config.name
    };
  }

  getAllConnectionStatuses() {
    const statuses: Array<{ id: number; status: any }> = [];
    
    this.connections.forEach((connInfo, id) => {
      statuses.push({
        id,
        status: this.getConnectionStatus(id)
      });
    });
    
    return statuses;
  }
}

// Export singleton instance
export const mcpDatabaseConnector = new McpDatabaseConnector();