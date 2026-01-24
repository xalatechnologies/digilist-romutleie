# Database Migrations

This directory contains SQL migration files for the database schema.

## Migration Files

- `001_create_audit_log_table.sql` - Creates the unified AuditLog table with indexes
- `002_add_availability_indexes.sql` - Adds indexes for room availability and date-range queries (depends on bookings/rooms tables)
- `003_create_rooms_and_reservations.sql` - Creates rooms and reservations tables for availability engine
- `004_create_housekeeping_tasks.sql` - Creates housekeeping_tasks table for tracking cleaning tasks
- `005_create_kitchen.sql` - Creates kitchen_items and meal_orders tables for kitchen module
- `006_create_billing.sql` - Creates invoices, invoice_lines, and payments tables for billing module
- `007_create_outbox_and_exports.sql` - Creates integration_outbox and accounting_exports tables for Visma export
- `008_add_report_indexes.sql` - Adds indexes for report queries (occupancy and invoice history)

## Running Migrations

### Using a migration tool (e.g., node-pg-migrate, Knex, Prisma):

```bash
# Example with node-pg-migrate
npm run migrate up

# Example with Knex
npx knex migrate:latest

# Example with Prisma
npx prisma migrate deploy
```

### Manual execution:

```bash
psql -U your_user -d your_database -f migrations/001_create_audit_log_table.sql
```

## Migration Naming Convention

Format: `{number}_{description}.sql`

- Number: Sequential migration number (001, 002, etc.)
- Description: Brief description of what the migration does

## Index Strategy

The AuditLog table includes indexes optimized for common query patterns:

1. **Entity queries**: `(entity_type, entity_id, created_at)` - Get all logs for a specific entity
2. **Actor queries**: `(actor_user_id, created_at)` - Get all actions by a user
3. **Organization queries**: `(org_id, created_at)` - Get all logs for an organization
4. **Action queries**: `(action, created_at)` - Get all events of a specific type
5. **Time queries**: `(created_at)` - Get recent logs

## Notes

- All migrations should be idempotent (use `IF NOT EXISTS` where appropriate)
- Indexes are created after table creation for performance
- JSON columns are used for flexible schema (before_state, after_state, metadata)

