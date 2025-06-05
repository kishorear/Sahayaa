import type { Express } from "express";
import { spawn } from "child_process";
import path from "path";

/**
 * Knowledge Repository Sync Routes
 * Provides API endpoints for one-click knowledge repository synchronization
 */
export function registerKnowledgeSyncRoutes(app: Express) {
  
  // Helper function to execute Python sync service
  const executePythonSync = (command: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const pythonScript = `
from services.knowledge_sync_service import get_knowledge_sync_service
import json

try:
    sync_service = get_knowledge_sync_service()
    result = sync_service.${command}()
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({"success": false, "error": str(e)}, indent=2))
`;

      const pythonProcess = spawn('python', ['-c', pythonScript], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  };

  // One-click sync endpoint
  app.post("/api/knowledge/sync", async (req, res) => {
    try {
      console.log("Starting one-click knowledge repository sync");
      
      const result = await executePythonSync('perform_one_click_sync');
      
      if (result.success) {
        console.log(`Knowledge sync completed successfully in ${result.sync_duration_ms}ms`);
        res.status(200).json({
          success: true,
          message: "Knowledge repository synchronized successfully",
          data: result
        });
      } else {
        console.error("Knowledge sync failed:", result.error);
        res.status(500).json({
          success: false,
          message: "Knowledge repository sync failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Knowledge sync endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to execute knowledge sync",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get sync status
  app.get("/api/knowledge/status", async (req, res) => {
    try {
      const result = await executePythonSync('get_sync_status');
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Knowledge status endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sync status",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Scan for changes (without syncing)
  app.get("/api/knowledge/scan", async (req, res) => {
    try {
      const result = await executePythonSync('scan_for_changes');
      
      res.status(200).json({
        success: true,
        message: "File changes scanned successfully",
        data: result
      });
    } catch (error) {
      console.error("Knowledge scan endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to scan for changes",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cleanup old backups
  app.post("/api/knowledge/cleanup", async (req, res) => {
    try {
      const { keepDays = 7 } = req.body;
      
      const pythonScript = `
from services.knowledge_sync_service import get_knowledge_sync_service
import json

try:
    sync_service = get_knowledge_sync_service()
    result = sync_service.cleanup_old_backups(${keepDays})
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({"success": false, "error": str(e)}, indent=2))
`;

      const result = await new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['-c', pythonScript], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(stdout));
            } catch (parseError) {
              reject(new Error(`Failed to parse cleanup output: ${parseError}`));
            }
          } else {
            reject(new Error(`Cleanup process failed: ${stderr}`));
          }
        });
      });

      res.status(200).json({
        success: true,
        message: "Backup cleanup completed",
        data: result
      });
    } catch (error) {
      console.error("Knowledge cleanup endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup backups",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get knowledge search results (for testing)
  app.post("/api/knowledge/search", async (req, res) => {
    try {
      const { query, limit = 3 } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Query parameter is required"
        });
      }

      const pythonScript = `
from services.unified_knowledge_service import get_unified_knowledge_service
import json

try:
    knowledge_service = get_unified_knowledge_service()
    results = knowledge_service.search_knowledge("${query}", ${limit})
    context = knowledge_service.get_knowledge_context("${query}", ${limit})
    
    output = {
        "success": True,
        "query": "${query}",
        "results": results,
        "context": context,
        "result_count": len(results)
    }
    print(json.dumps(output, indent=2))
except Exception as e:
    print(json.dumps({"success": false, "error": str(e)}, indent=2))
`;

      const result = await new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['-c', pythonScript], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(stdout));
            } catch (parseError) {
              reject(new Error(`Failed to parse search output: ${parseError}`));
            }
          } else {
            reject(new Error(`Search process failed: ${stderr}`));
          }
        });
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("Knowledge search endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search knowledge base",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}