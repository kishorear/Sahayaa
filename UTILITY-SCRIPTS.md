# Utility Scripts Documentation

This document provides information about the utility scripts included with the support ticket management system.

## Tenant Ticket Manager

The Tenant Ticket Manager script provides functionality to manage tickets on a per-tenant basis.

### Usage

```bash
# View ticket counts for a specific tenant
node tenant-ticket-manager.cjs 2 count

# Create sample tickets for a specific tenant
node tenant-ticket-manager.cjs 2 create 5

# Delete all tickets for a specific tenant
node tenant-ticket-manager.cjs 2 delete

# Reset (delete and recreate) tickets for a specific tenant
node tenant-ticket-manager.cjs 2 reset 10

# Interactive mode (run without arguments)
node tenant-ticket-manager.cjs
```

### Features

- View ticket counts and breakdowns by category, status, and complexity
- Create sample tickets with randomized properties
- Delete tickets for a specific tenant
- Reset ticket ID sequence numbers
- Interactive menu mode for guided operations

### Notes

- The script uses CommonJS format for maximum compatibility
- Database connection uses the DATABASE_URL environment variable
- Sample tickets include realistic randomized data
- All operations are scoped by tenant ID for proper data isolation

## Database Management Scripts

### add-company-column.cjs

This script adds a company column to the users table and also provides ticket management functionality.

```bash
# Usage
node add-company-column.cjs <tenantId> [action] [count]

# Example
node add-company-column.cjs 2 create 5
```

### reset-tenant-tickets.cjs

This script resets tickets for a specific tenant.

```bash
# Usage  
node reset-tenant-tickets.cjs <tenantId> [action] [count]

# Example
node reset-tenant-tickets.cjs 2 reset 10
```

## Other Utility Scripts

- **check-db.js**: Checks database connection and tests user authentication
- **create-creator.js**: Creates a creator user with appropriate permissions
- **create-document-tables.js**: Sets up document storage tables
- **reset-admin.js**: Resets the admin user account
- **reset-ticket-count.js**: Resets ticket counter sequence
- **test-openai.js**: Tests the OpenAI integration