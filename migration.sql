-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  "apiKey" TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{"primaryColor": "#4F46E5", "logo": null, "companyName": "", "emailTemplate": "default"}',
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default tenant (for backward compatibility)
INSERT INTO tenants (id, name, subdomain, "apiKey")
VALUES (1, 'Default Tenant', 'default', 'default-tenant-api-key-' || (RANDOM() * 1000000)::INT)
ON CONFLICT (id) DO NOTHING;

-- Add tenantId column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;
-- Create unique index for username per tenant
CREATE UNIQUE INDEX IF NOT EXISTS username_tenant_unique ON users(username, "tenantId");

-- Add tenantId column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;
-- Add clientMetadata column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "clientMetadata" JSONB;

-- Add tenantId column to data_sources table
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS "tenantId" INTEGER NOT NULL DEFAULT 1;

-- Create table relationships
ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE data_sources ADD CONSTRAINT fk_data_sources_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;