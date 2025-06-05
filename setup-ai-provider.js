import pkg from 'pg';
const { Client } = pkg;

async function setupAIProvider() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check if AI provider already exists for tenant 1
    const existingProvider = await client.query(
      'SELECT * FROM ai_providers WHERE "tenantId" = $1 AND type = $2', 
      [1, 'gemini']
    );
    
    if (existingProvider.rows.length === 0) {
      // Create a new Gemini AI provider for tenant 1
      const result = await client.query(`
        INSERT INTO ai_providers (
          "tenantId", "teamId", name, type, model, "apiKey", enabled, 
          "useForChat", "useForClassification", "useForAutoResolve",
          priority, "contextWindow", "maxTokens", temperature
        ) VALUES (
          $1, NULL, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13
        ) RETURNING *
      `, [
        1, 'Gemini AI', 'gemini', 'gemini-1.5-flash', process.env.GEMINI_API_KEY, true,
        true, true, true,
        100, 8000, 1000, 0.7
      ]);
      
      console.log('Created AI provider:', result.rows[0]);
    } else {
      // Update existing provider with new API key and model
      const result = await client.query(`
        UPDATE ai_providers 
        SET "apiKey" = $1, model = $2, enabled = $3
        WHERE "tenantId" = $4 AND type = $5
        RETURNING *
      `, [process.env.GEMINI_API_KEY, 'gemini-1.5-flash', true, 1, 'gemini']);
      
      console.log('Updated AI provider:', result.rows[0]);
    }
    
    console.log('AI provider setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up AI provider:', error);
  } finally {
    await client.end();
  }
}

setupAIProvider();