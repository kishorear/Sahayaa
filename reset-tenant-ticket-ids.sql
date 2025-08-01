-- Reset tenant-specific ticket IDs for all tenants
-- This script ensures each tenant has sequential ticket numbering starting from 1

-- Reset for all existing tenants dynamically
DO $$
DECLARE
    tenant_rec RECORD;
BEGIN
    -- Loop through all tenants that have tickets
    FOR tenant_rec IN 
        SELECT DISTINCT "tenantId" FROM tickets ORDER BY "tenantId"
    LOOP
        -- Reset tenantTicketId for each tenant
        EXECUTE format('
            WITH tenant_tickets AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) as new_tenant_ticket_id
                FROM tickets 
                WHERE "tenantId" = %L
            )
            UPDATE tickets 
            SET "tenantTicketId" = tenant_tickets.new_tenant_ticket_id
            FROM tenant_tickets 
            WHERE tickets.id = tenant_tickets.id
        ', tenant_rec."tenantId");
        
        RAISE NOTICE 'Reset ticket numbering for tenant %', tenant_rec."tenantId";
    END LOOP;
END
$$;

-- Verify the reset
SELECT "tenantId", COUNT(*) as ticket_count, MIN("tenantTicketId") as min_id, MAX("tenantTicketId") as max_id 
FROM tickets 
GROUP BY "tenantId" 
ORDER BY "tenantId";