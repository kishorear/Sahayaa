import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

/**
 * Test ChromaDB agent workflow
 */
router.post('/test-chromadb', async (req, res) => {
  try {
    const { query = "I can't login after password reset", test_type = "comprehensive" } = req.body;
    
    // Run ChromaDB test script
    const pythonScript = path.join(process.cwd(), 'test_chromadb_direct.py');
    
    const testProcess = spawn('python', [pythonScript], {
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
        TEST_QUERY: query,
        TEST_TYPE: test_type
      },
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        // Parse the test output for key metrics
        const lines = stdout.split('\n');
        const servicePass = stdout.includes('ChromaDB Service: PASS');
        const agentsPass = stdout.includes('ChromaDB Agents: PASS');
        const overallSuccess = stdout.includes('Overall Success: YES');
        
        // Extract statistics
        const instructionMatch = stdout.match(/Instructions: (\d+)/);
        const ticketMatch = stdout.match(/Tickets: (\d+)/);
        const storageMatch = stdout.match(/Storage Type: (\w+)/);
        
        // Extract workflow trace information
        const workflowSteps = [];
        let currentStep = null;
        
        for (const line of lines) {
          if (line.includes('✓') || line.includes('✗')) {
            if (line.includes('Resource:')) {
              if (currentStep) {
                currentStep.resource = line.split('Resource: ')[1];
              }
            } else if (line.includes('Output:')) {
              if (currentStep) {
                currentStep.output = line.split('Output: ')[1];
                workflowSteps.push(currentStep);
                currentStep = null;
              }
            } else {
              // New step
              const stepMatch = line.match(/(✓|✗)\s+(\w+):\s+(\w+)\s+\(([0-9.]+)ms\)/);
              if (stepMatch) {
                currentStep = {
                  success: stepMatch[1] === '✓',
                  step: stepMatch[2],
                  agent: stepMatch[3],
                  duration_ms: parseFloat(stepMatch[4])
                };
              }
            }
          }
        }
        
        res.json({
          success: overallSuccess,
          chromadb_service: servicePass,
          chromadb_agents: agentsPass,
          storage_type: storageMatch ? storageMatch[1] : 'chromadb',
          instruction_count: instructionMatch ? parseInt(instructionMatch[1]) : 0,
          ticket_count: ticketMatch ? parseInt(ticketMatch[1]) : 0,
          workflow_trace: workflowSteps,
          total_duration_ms: workflowSteps.reduce((sum, step) => sum + step.duration_ms, 0),
          test_output: stdout,
          query_tested: query
        });
      } else {
        console.error('ChromaDB test failed:', stderr);
        res.status(500).json({
          success: false,
          error: `Test process failed with code ${code}`,
          stderr: stderr,
          stdout: stdout
        });
      }
    });
    
  } catch (error) {
    console.error('ChromaDB test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Test agent workflow fallback
 */
router.post('/test-workflow', async (req, res) => {
  try {
    const { user_message, user_context } = req.body;
    
    // Simulate agent workflow response
    const mockResponse = {
      success: true,
      ticket_id: 12345,
      ticket_title: "Support Request - " + user_message.substring(0, 50),
      status: "created",
      category: "general",
      urgency: "medium",
      resolution_steps: [
        "Request received and processed",
        "Initial classification completed", 
        "Assigned to support team",
        "Awaiting user response"
      ],
      resolution_steps_count: 4,
      confidence_score: 0.75,
      processing_time_ms: 250,
      created_at: new Date().toISOString(),
      source: "agent_test",
      workflow_trace: [
        {
          step: "0a",
          agent: "ChatProcessorAgent",
          input: user_message.substring(0, 30) + "...",
          resource: "Message Processing",
          output: "Processed and normalized message",
          duration_ms: 50,
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          step: "1a", 
          agent: "InstructionLookupAgent",
          input: "Query processed message",
          resource: "Local Vector Storage",
          output: "Found relevant instructions",
          duration_ms: 100,
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          step: "2a",
          agent: "TicketLookupAgent", 
          input: "Search similar tickets",
          resource: "Local Vector Storage",
          output: "Found similar tickets",
          duration_ms: 75,
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          step: "3a",
          agent: "TicketFormatterAgent",
          input: "Format response",
          resource: "AI Formatting",
          output: "Generated ticket response",
          duration_ms: 25,
          success: true,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    res.json(mockResponse);
    
  } catch (error) {
    console.error('Agent workflow test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;