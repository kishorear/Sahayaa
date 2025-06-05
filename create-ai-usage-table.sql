-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    request_type TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    response_time INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    cost INTEGER,
    ticket_id INTEGER,
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_id ON ai_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_id ON ai_usage(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_timestamp ON ai_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_request_type ON ai_usage(request_type);

-- Insert some sample data for demonstration
INSERT INTO ai_usage (tenant_id, provider_id, request_type, model, tokens_used, response_time, success, cost, user_id) VALUES
(1, 1, 'chat', 'gpt-4', 150, 1200, true, 4, 15),
(1, 1, 'classification', 'gpt-4', 80, 800, true, 2, 15),
(1, 1, 'auto_resolve', 'gpt-4', 300, 1800, true, 8, 15),
(1, 1, 'email', 'gpt-4', 200, 1000, true, 6, 15),
(1, 26, 'chat', 'gemini-pro', 120, 900, true, 2, 15),
(1, 26, 'classification', 'gemini-pro', 60, 600, true, 1, 15),
(1, 26, 'auto_resolve', 'gemini-pro', 250, 1400, false, 0, 15),
(1, 26, 'email', 'gemini-pro', 180, 1100, true, 3, 15);