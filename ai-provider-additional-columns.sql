-- Add any remaining missing columns to the ai_providers table to match the schema in code
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "contextWindow" INTEGER DEFAULT 8000 NOT NULL;
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "maxTokens" INTEGER DEFAULT 1000 NOT NULL;
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "temperature" INTEGER DEFAULT 7 NOT NULL;

-- Update column descriptions
COMMENT ON COLUMN ai_providers."priority" IS 'Priority (1-100, higher = more priority)';
COMMENT ON COLUMN ai_providers."contextWindow" IS 'Max context window size in tokens';
COMMENT ON COLUMN ai_providers."maxTokens" IS 'Max output tokens to generate';
COMMENT ON COLUMN ai_providers."temperature" IS 'Temperature setting (0-10, divided by 10 in code)';