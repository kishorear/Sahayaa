/**
 * Initialize Vector Storage with Instruction Files
 * Processes instruction files and creates local vector storage for the InstructionLookupAgent
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const INSTRUCTIONS_DIR = 'instructions';
const VECTOR_STORAGE_DIR = 'vector_storage';
const VECTOR_STORAGE_FILE = path.join(VECTOR_STORAGE_DIR, 'documents.json');

class VectorStorageInitializer {
  constructor() {
    this.genAI = null;
    this.initializeGoogleAI();
  }

  initializeGoogleAI() {
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
      console.log('Google AI initialized for embeddings');
    } else {
      console.error('GOOGLE_API_KEY not found in environment variables');
      process.exit(1);
    }
  }

  async generateEmbedding(text) {
    if (!this.genAI) {
      throw new Error('Google AI not available for embeddings');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async findInstructionFiles() {
    try {
      const files = await fs.readdir(INSTRUCTIONS_DIR);
      return files
        .filter(file => file.endsWith('.txt'))
        .map(file => path.join(INSTRUCTIONS_DIR, file));
    } catch (error) {
      console.error('Error reading instructions directory:', error);
      return [];
    }
  }

  async processInstructionFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      console.log(`Processing ${filename}...`);
      
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content);
      
      return {
        id: `instruction_${filename}_${Date.now()}`,
        text: content,
        filename,
        embedding,
        metadata: {
          fileSize: content.length,
          processedAt: new Date().toISOString(),
          source: 'instruction_file'
        }
      };
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return null;
    }
  }

  async ensureVectorStorageDir() {
    try {
      await fs.mkdir(VECTOR_STORAGE_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating vector storage directory:', error);
    }
  }

  async saveVectorStorage(documents) {
    await this.ensureVectorStorageDir();
    
    const vectorData = {
      documents,
      metadata: {
        version: '1.0',
        totalDocuments: documents.length,
        lastUpdated: new Date().toISOString(),
        embeddingModel: 'text-embedding-004'
      }
    };

    try {
      await fs.writeFile(VECTOR_STORAGE_FILE, JSON.stringify(vectorData, null, 2));
      console.log(`Saved ${documents.length} documents to vector storage`);
    } catch (error) {
      console.error('Error saving vector storage:', error);
    }
  }

  async initialize() {
    console.log('Starting vector storage initialization...');

    // Find all instruction files
    const instructionFiles = await this.findInstructionFiles();
    console.log(`Found ${instructionFiles.length} instruction files`);

    if (instructionFiles.length === 0) {
      console.log('No instruction files found. Creating sample files...');
      await this.createSampleInstructions();
      return;
    }

    // Process each file
    const documents = [];
    for (const filePath of instructionFiles) {
      const doc = await this.processInstructionFile(filePath);
      if (doc) {
        documents.push(doc);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save to vector storage
    await this.saveVectorStorage(documents);
    
    console.log('Vector storage initialization complete!');
    console.log(`Processed ${documents.length} instruction documents`);
  }

  async createSampleInstructions() {
    await fs.mkdir(INSTRUCTIONS_DIR, { recursive: true });
    
    const sampleFiles = [
      {
        filename: 'customer_service_basics.txt',
        content: `# Customer Service Basics

## Communication Guidelines
- Use professional and friendly tone
- Listen actively to customer concerns
- Provide clear and concise explanations
- Follow up to ensure satisfaction

## Common Scenarios
- Account issues: Verify identity first
- Billing questions: Check payment history
- Technical problems: Gather system information
- Feature requests: Document and escalate

## Escalation Process
- Level 1: Basic support issues
- Level 2: Technical specialists
- Level 3: Management and complex cases`
      }
    ];

    for (const file of sampleFiles) {
      const filePath = path.join(INSTRUCTIONS_DIR, file.filename);
      await fs.writeFile(filePath, file.content);
      console.log(`Created sample file: ${file.filename}`);
    }

    console.log('Sample instruction files created. Run the script again to process them.');
  }
}

// Run the initializer
async function main() {
  const initializer = new VectorStorageInitializer();
  await initializer.initialize();
}

main().catch(console.error);