-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add a unique constraint on team name + tenantId
CREATE UNIQUE INDEX IF NOT EXISTS team_name_tenant_unique ON teams (name, "tenantId");

-- Add teamId column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'teamId') THEN
    ALTER TABLE users ADD COLUMN "teamId" INTEGER;
  END IF;
END $$;

-- Add teamId and createdBy columns to tickets table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'tickets' AND column_name = 'teamId') THEN
    ALTER TABLE tickets ADD COLUMN "teamId" INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'tickets' AND column_name = 'createdBy') THEN
    ALTER TABLE tickets ADD COLUMN "createdBy" INTEGER;
  END IF;
END $$;

-- Create a default team for each tenant
INSERT INTO teams (name, description, "tenantId")
SELECT 'Default Team', 'Default team created during migration', id
FROM tenants
ON CONFLICT (name, "tenantId") DO NOTHING;

-- Update users without teamId to use the default team for their tenant
UPDATE users
SET "teamId" = t.id
FROM teams t
WHERE users."teamId" IS NULL AND t.name = 'Default Team' AND users."tenantId" = t."tenantId";

-- Update tickets without teamId to use the default team for their tenant 
UPDATE tickets
SET "teamId" = t.id
FROM teams t
WHERE tickets."teamId" IS NULL AND t.name = 'Default Team' AND tickets."tenantId" = t."tenantId";