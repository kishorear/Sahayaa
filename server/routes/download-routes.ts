import type { Express, Request, Response } from "express";
import path from "path";
import fs from "fs";

/**
 * Registers routes for handling file downloads
 * @param app Express application
 */
export function registerDownloadRoutes(app: Express) {
  // Route to handle widget package downloads
  app.get("/downloads/:folder/:file", (req: Request, res: Response) => {
    const folder = req.params.folder;
    const file = req.params.file;
    
    // Construct the file path from the public directory
    const filePath = path.join(process.cwd(), "public", "downloads", folder, file);
    
    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Determine the content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = "application/octet-stream"; // Default content type
      
      switch (ext) {
        case ".js":
          contentType = "application/javascript";
          break;
        case ".html":
          contentType = "text/html";
          break;
        case ".css":
          contentType = "text/css";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
        case ".gif":
          contentType = "image/gif";
          break;
        case ".svg":
          contentType = "image/svg+xml";
          break;
        case ".md":
          contentType = "text/markdown";
          break;
        case ".zip":
          contentType = "application/zip";
          break;
      }
      
      // Set the appropriate headers
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      // File not found
      res.status(404).json({ message: "File not found" });
    }
  });

  // Route to handle the complete widget package download
  app.get("/downloads/:file", (req: Request, res: Response) => {
    const file = req.params.file;
    
    // Construct the file path from the public directory
    const filePath = path.join(process.cwd(), "public", "downloads", file);
    
    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Set appropriate headers for zip files
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      // File not found
      res.status(404).json({ message: "File not found" });
    }
  });
}