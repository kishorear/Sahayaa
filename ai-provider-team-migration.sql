-- Add teamId column to ai_providers table
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "teamId" INTEGER;

-- Create audit log table for AI provider changes if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_provider_audit (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    team_id INTEGER,
    provider_id INTEGER,
    success BOOLEAN DEFAULT TRUE,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on audit log table
CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_user ON ai_provider_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_tenant ON ai_provider_audit(tenant_id);