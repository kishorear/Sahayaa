-- Migration to add per-tenant ticket ID numbering
-- This adds a tenantTicketId column to track sequential ticket numbers within each tenant

-- Add the new column
ALTER TABLE tickets ADD COLUMN "tenantTicketId" INTEGER;

-- Create a function to calculate tenant-specific ticket IDs
-- For existing tickets, we'll assign sequential IDs based on creation order within each tenant
WITH tenant_ticket_numbers AS (
  SELECT 
    id,
    "tenantId",
    ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "createdAt" ASC, id ASC) as new_tenant_ticket_id
  FROM tickets
  WHERE "tenantTicketId" IS NULL
)
UPDATE tickets 
SET "tenantTicketId" = tenant_ticket_numbers.new_tenant_ticket_id
FROM tenant_ticket_numbers
WHERE tickets.id = tenant_ticket_numbers.id;

-- Make the column NOT NULL after populating existing data
ALTER TABLE tickets ALTER COLUMN "tenantTicketId" SET NOT NULL;

-- Create unique index on tenantTicketId + tenantId to ensure per-tenant uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_ticket_id_unique" ON tickets ("tenantTicketId", "tenantId");

-- Verify the migration worked correctly
SELECT 
  "tenantId",
  COUNT(*) as total_tickets,
  MIN("tenantTicketId") as min_ticket_id,
  MAX("tenantTicketId") as max_ticket_id
FROM tickets 
GROUP BY "tenantId" 
ORDER BY "tenantId";