import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

/**
 * Simple file content extractor that reads text from uploaded files
 * Supports text files and Excel spreadsheets
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  try {
    // Get file extension to determine how to parse it
    const ext = path.extname(filePath).toLowerCase();
    
    // Text file handling
    if (ext === '.txt' || ext === '.md' || ext === '.html') {
      // For text files, simply read the content
      return fs.readFileSync(filePath, 'utf8');
    } 
    // Excel file handling (.xlsx, .xls, .csv)
    else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      let result = '';
      
      // Process each sheet
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Add sheet name as header
        result += `## Sheet: ${sheetName}\n\n`;
        
        // Convert sheet data to string
        for (const row of json) {
          if (Array.isArray(row) && row.length > 0) {
            result += row.join('\t') + '\n';
          }
        }
        
        result += '\n\n';
      }
      
      return result;
    } 
    // For other formats, return a placeholder message
    else {
      // For other formats like PDF, DOCX, etc., return a placeholder
      // In a real app, you would use libraries like pdf-parse, mammoth, etc.
      return `[This is extracted content from ${path.basename(filePath)}. In a production environment, specialized parsers would be used for this file type.]`;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

/**
 * Extracts metadata from the file (size, type, etc.)
 */
export function extractFileMetadata(filePath: string): Record<string, any> {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    
    return {
      filename,
      fileSize: stats.size,
      fileType: ext,
      lastModified: stats.mtime,
      created: stats.birthtime
    };
  } catch (error) {
    console.error('Error extracting metadata from file:', error);
    return {};
  }
}