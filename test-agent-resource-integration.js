#!/usr/bin/env node

/**
 * Agent Resource Integration Test
 * 
 * This script tests whether agents are properly reading and using uploaded files.
 * It creates ChromaDB collections from uploaded files and verifies agent lookup functionality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TENANT_ID = 1;
const AGENT_TYPES = ['chat-preprocessor', 'instruction-lookup', 'ticket-lookup', 'ticket-formatter'];
const UPLOADS_BASE = './uploads/agent-resources';

// Test functions
async function testAgentResourceIntegration() {
  console.log('🔍 Testing Agent Resource Integration\n');
  
  // 1. Check uploaded files
  await checkUploadedFiles();
  
  // 2. Test ChromaDB integration
  await testChromaDBIntegration();
  
  // 3. Test agent lookup functionality
  await testAgentLookup();
  
  // 4. Generate usage report
  await generateUsageReport();
}

async function checkUploadedFiles() {
  console.log('📁 Checking uploaded files...');
  
  for (const agentType of AGENT_TYPES) {
    const agentDir = path.join(UPLOADS_BASE, `tenant-${TENANT_ID}`, agentType);
    
    if (fs.existsSync(agentDir)) {
      const files = fs.readdirSync(agentDir);
      console.log(`  ✓ ${agentType}: ${files.length} files`);
      
      files.forEach(file => {
        const filePath = path.join(agentDir, file);
        const stats = fs.statSync(filePath);
        console.log(`    - ${file} (${Math.round(stats.size / 1024)}KB)`);
      });
    } else {
      console.log(`  ⚠️  ${agentType}: No files uploaded`);
    }
  }
  console.log();
}

async function testChromaDBIntegration() {
  console.log('🗄️  Testing ChromaDB integration...');
  
  try {
    // Check if ChromaDB is accessible
    const chromaTest = await fetch('http://localhost:8000/api/v1/heartbeat').catch(() => null);
    
    if (chromaTest && chromaTest.ok) {
      console.log('  ✓ ChromaDB is running');
      
      // List collections
      const collectionsResponse = await fetch('http://localhost:8000/api/v1/collections');
      if (collectionsResponse.ok) {
        const collections = await collectionsResponse.json();
        console.log(`  ✓ Found ${collections.length} collections`);
        
        collections.forEach(collection => {
          console.log(`    - ${collection.name} (${collection.count || 'unknown'} documents)`);
        });
      }
    } else {
      console.log('  ⚠️  ChromaDB not accessible - using file-based storage');
    }
  } catch (error) {
    console.log(`  ❌ ChromaDB error: ${error.message}`);
  }
  console.log();
}

async function testAgentLookup() {
  console.log('🤖 Testing agent lookup functionality...');
  
  // Test queries that should match uploaded content
  const testQueries = [
    'FAQ template',
    'troubleshooting guide',
    'customer onboarding',
    'product description template',
    'knowledge base article'
  ];
  
  for (const query of testQueries) {
    console.log(`  Testing query: "${query}"`);
    
    try {
      // Test instruction lookup agent
      const response = await fetch('http://localhost:8001/test-instruction-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          tenant_id: TENANT_ID
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.instructions && result.instructions.length > 0) {
          console.log(`    ✓ Found ${result.instructions.length} relevant instructions`);
          result.instructions.forEach((instr, idx) => {
            console.log(`      ${idx + 1}. ${instr.content.substring(0, 100)}...`);
          });
        } else {
          console.log(`    ⚠️  No instructions found for "${query}"`);
        }
      } else {
        console.log(`    ❌ Agent service not responding (${response.status})`);
      }
    } catch (error) {
      console.log(`    ❌ Error testing query: ${error.message}`);
    }
  }
  console.log();
}

async function generateUsageReport() {
  console.log('📊 Generating usage report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    tenant_id: TENANT_ID,
    uploaded_files: {},
    agent_accessibility: {},
    recommendations: []
  };
  
  // Count files per agent
  for (const agentType of AGENT_TYPES) {
    const agentDir = path.join(UPLOADS_BASE, `tenant-${TENANT_ID}`, agentType);
    
    if (fs.existsSync(agentDir)) {
      const files = fs.readdirSync(agentDir);
      report.uploaded_files[agentType] = files.length;
      
      if (files.length === 0) {
        report.recommendations.push(`Upload files for ${agentType} to improve agent responses`);
      }
    } else {
      report.uploaded_files[agentType] = 0;
      report.recommendations.push(`Create upload directory for ${agentType}`);
    }
  }
  
  // Save report
  const reportPath = './agent-resource-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`  ✓ Report saved to ${reportPath}`);
  console.log(`  📈 Total files: ${Object.values(report.uploaded_files).reduce((a, b) => a + b, 0)}`);
  
  if (report.recommendations.length > 0) {
    console.log('  💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`    - ${rec}`));
  }
  console.log();
}

// Run the test
if (require.main === module) {
  testAgentResourceIntegration().catch(console.error);
}

module.exports = { testAgentResourceIntegration };