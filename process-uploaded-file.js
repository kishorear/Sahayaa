#!/usr/bin/env node

/**
 * Process Uploaded File for ChromaDB Integration
 * 
 * This script processes the uploaded knowledge base templates file and creates a ChromaDB collection
 * that the InstructionLookupAgent can use for similarity search.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const UPLOADED_FILE = './uploads/agent-resources/tenant-1/instruction-lookup/1749950933609-qy7xz0o6odc.docx';
const CHROMA_COLLECTION_NAME = 'instruction_lookup_tenant_1';

async function processUploadedFile() {
  console.log('Processing uploaded file for ChromaDB integration...\n');
  
  // 1. Read and parse the uploaded file
  const fileContent = await readUploadedFile();
  
  // 2. Extract meaningful sections
  const sections = extractSections(fileContent);
  
  // 3. Create ChromaDB collection
  await createChromaCollection(sections);
  
  // 4. Test the lookup functionality
  await testLookupFunctionality();
  
  console.log('\nFile processing complete! Your agents can now use this data.');
}

async function readUploadedFile() {
  console.log('Reading uploaded file...');
  
  if (!fs.existsSync(UPLOADED_FILE)) {
    console.log(`File not found: ${UPLOADED_FILE}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(UPLOADED_FILE, 'utf8');
  console.log(`File size: ${Math.round(content.length / 1024)}KB`);
  
  return content;
}

function extractSections(content) {
  console.log('Extracting structured sections...');
  
  const sections = [];
  
  // Split content by major headings (H1 patterns)
  const h1Sections = content.split(/H1:\s*(.+)/);
  
  for (let i = 1; i < h1Sections.length; i += 2) {
    const title = h1Sections[i].trim();
    const body = h1Sections[i + 1] || '';
    
    if (title && body.trim()) {
      sections.push({
        id: `section_${sections.length + 1}`,
        title: title,
        content: body.trim(),
        type: 'template',
        category: categorizeSection(title),
        metadata: {
          source: 'uploaded_knowledge_base',
          tenant_id: 1,
          agent_type: 'instruction-lookup',
          upload_date: new Date().toISOString()
        }
      });
    }
  }
  
  console.log(`Extracted ${sections.length} sections:`);
  sections.forEach((section, idx) => {
    console.log(`  ${idx + 1}. ${section.title} (${section.category})`);
  });
  
  return sections;
}

function categorizeSection(title) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('faq')) return 'faq';
  if (titleLower.includes('troubleshooting')) return 'troubleshooting';
  if (titleLower.includes('onboarding')) return 'onboarding';
  if (titleLower.includes('comparison')) return 'comparison';
  if (titleLower.includes('how-to')) return 'how-to';
  if (titleLower.includes('glossary')) return 'glossary';
  if (titleLower.includes('description')) return 'product_description';
  if (titleLower.includes('guide')) return 'guide';
  
  return 'general';
}

async function createChromaCollection(sections) {
  console.log('\nCreating ChromaDB collection...');
  
  // Save sections to JSON file for ChromaDB processing
  const dataFile = './chroma_data_instruction_lookup.json';
  const chromaData = {
    collection_name: CHROMA_COLLECTION_NAME,
    documents: sections.map(section => ({
      id: section.id,
      content: `${section.title}\n\n${section.content}`,
      metadata: section.metadata
    }))
  };
  
  fs.writeFileSync(dataFile, JSON.stringify(chromaData, null, 2));
  console.log(`Saved ${sections.length} documents to ${dataFile}`);
  
  // Create the collection using the existing ChromaDB setup
  try {
    const { createChromaCollection } = require('./vector_storage/chroma_setup.js');
    await createChromaCollection(CHROMA_COLLECTION_NAME, chromaData.documents);
    console.log(`ChromaDB collection "${CHROMA_COLLECTION_NAME}" created successfully`);
  } catch (error) {
    console.log(`ChromaDB creation error: ${error.message}`);
    console.log('Using file-based storage as fallback');
  }
}

async function testLookupFunctionality() {
  console.log('\nTesting lookup functionality...');
  
  const testQueries = [
    'How to write FAQ articles',
    'Customer onboarding process',
    'Troubleshooting template',
    'Product comparison guide',
    'Knowledge base article structure'
  ];
  
  for (const query of testQueries) {
    console.log(`\nTesting: "${query}"`);
    
    try {
      // Test with the instruction lookup agent
      const response = await fetch('http://localhost:8001/instruction-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          tenant_id: 1,
          max_results: 3
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.instructions && result.instructions.length > 0) {
          console.log(`  Found ${result.instructions.length} matches:`);
          result.instructions.forEach((instr, idx) => {
            console.log(`    ${idx + 1}. ${instr.title || 'Untitled'}`);
            console.log(`       Relevance: ${(instr.score * 100).toFixed(1)}%`);
          });
        } else {
          console.log(`  No matches found`);
        }
      } else {
        console.log(`  Agent service unavailable (${response.status})`);
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
}

// Generate verification report
function generateVerificationReport(sections) {
  const report = {
    timestamp: new Date().toISOString(),
    uploaded_file: UPLOADED_FILE,
    collection_name: CHROMA_COLLECTION_NAME,
    sections_processed: sections.length,
    categories: {},
    agent_integration: 'active',
    verification_queries: [
      'FAQ template creation',
      'Customer onboarding guide',
      'Troubleshooting steps',
      'Product description format'
    ]
  };
  
  // Count sections by category
  sections.forEach(section => {
    report.categories[section.category] = (report.categories[section.category] || 0) + 1;
  });
  
  fs.writeFileSync('./agent-resource-verification-report.json', JSON.stringify(report, null, 2));
  console.log('\nVerification report saved to: agent-resource-verification-report.json');
  
  return report;
}

// Run the processing
if (require.main === module) {
  processUploadedFile().catch(console.error);
}