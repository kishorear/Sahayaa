-- Add missing columns to the ai_providers table to match the schema in code
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT FALSE;

-- Add other potentially missing columns that could cause issues
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT TRUE;

-- Update column descriptions
COMMENT ON COLUMN ai_providers."isDefault" IS 'Whether this provider is the default option for the tenant/team';
COMMENT ON COLUMN ai_providers."isPrimary" IS 'Whether this provider is the primary option for the tenant/team';
COMMENT ON COLUMN ai_providers."enabled" IS 'Whether this provider is enabled';