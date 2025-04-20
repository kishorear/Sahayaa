-- Add teamId column to ai_providers table for team-scoped access control
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "teamId" INTEGER;

-- Add index on ai_providers(tenantId, teamId) for improved query performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_tenant_team ON ai_providers("tenantId", "teamId");

-- Create ai_provider_audit table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS ai_provider_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    team_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    action TEXT NOT NULL,
    provider_id INTEGER,
    success BOOLEAN DEFAULT TRUE,
    details JSONB
);

-- Add index on ai_provider_audit(user_id, tenant_id) for query performance
CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_user_tenant ON ai_provider_audit(user_id, tenant_id);

-- Add index on ai_provider_audit(timestamp) for chronological queries
CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_timestamp ON ai_provider_audit(timestamp);

-- Add index on ai_provider_audit(provider_id) for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_provider ON ai_provider_audit(provider_id);

-- Make all existing AI providers available to all teams within their tenant
-- by setting teamId to NULL (meaning available to all teams)
UPDATE ai_providers SET "teamId" = NULL;

-- Create comment explaining the schema purpose
COMMENT ON TABLE ai_providers IS 'Stores AI provider configurations with tenant and team-level scoping';
COMMENT ON COLUMN ai_providers."teamId" IS 'Team ID this provider is restricted to, NULL means available to all teams in tenant';
COMMENT ON TABLE ai_provider_audit IS 'Audit log for AI provider access and management operations';