# Visma Export Implementation

## Overview

This document describes the Visma export implementation using the Outbox pattern for reliable integration processing with retries and audit logging.

## Schema Changes

### Migration: `007_create_outbox_and_exports.sql`

Creates two tables:

1. **`integration_outbox`** table:
   - `id` (uuid primary key)
   - `event_type` (text, e.g., VISMA_EXPORT_INVOICE)
   - `entity_type` (text, e.g., INVOICE)
   - `entity_id` (uuid)
   - `payload` (JSONB)
   - `status` (PENDING, PROCESSING, SUCCEEDED, FAILED)
   - `retry_count` (integer, default 0)
   - `last_error` (text, nullable)
   - `next_retry_at` (timestamp, nullable)
   - `created_at`, `updated_at`

2. **`accounting_exports`** table:
   - `id` (uuid primary key)
   - `invoice_id` (references invoices, CASCADE delete)
   - `target_system` (default 'VISMA')
   - `status` (PENDING, SENT, FAILED, CONFIRMED)
   - `external_ref` (nullable, Visma invoice ID)
   - `last_error` (nullable)
   - `created_at`, `updated_at`
   - **UNIQUE constraint**: `(invoice_id, target_system)` - prevents duplicate exports per invoice

**Indexes:**
- `integration_outbox(status, next_retry_at, created_at)` - for processor queries
- `integration_outbox(entity_type, entity_id)` - for entity lookups
- `accounting_exports(invoice_id, status)` - for export status queries

## Architecture

### Outbox Pattern

The Outbox pattern ensures reliable integration processing:

1. **Enqueue**: Export request is queued to `integration_outbox` with status=PENDING
2. **Process**: Background processor picks up PENDING events
3. **Retry**: Failed events are retried with exponential backoff
4. **Track**: `accounting_exports` tracks final status per invoice

### Retry Logic

- **Max Retries**: 5 attempts
- **Backoff Schedule**:
  - Attempt 1: 1 minute
  - Attempt 2: 5 minutes
  - Attempt 3: 15 minutes
  - Attempt 4: 1 hour
  - Attempt 5: 1 hour (max)
- **Terminal Failure**: After 5 failed attempts, status=FAILED (no more retries)

## Backend Services

### `OutboxService` (`backend/src/services/outboxService.ts`)

- `enqueue(eventType, entityType, entityId, payload)` - Adds event to outbox

### `OutboxProcessor` (`backend/src/services/outboxProcessor.ts`)

- `processPending(req)` - Processes pending events:
  - Fetches events where `status=PENDING` and `next_retry_at <= now`
  - Marks as PROCESSING
  - Routes to handler based on `event_type`
  - On success: status=SUCCEEDED
  - On failure: schedules retry or marks as FAILED

### `BillingExportService` (`backend/src/services/billingExportService.ts`)

- `queueVismaExport(req, invoiceId)` - Queues export:
  - Validates invoice exists
  - Validates reference1/reference2 not empty
  - Creates/updates `accounting_exports` (status=PENDING)
  - Enqueues outbox event
  - Logs audit: VISMA_EXPORT_QUEUED

- `retryVismaExport(req, invoiceId)` - Retries failed export:
  - Resets export status to PENDING
  - Enqueues new outbox event
  - Logs audit: VISMA_EXPORT_QUEUED (retry)

- `getExportStatus(invoiceId)` - Returns export status

### `VismaAdapter` (`backend/src/adapters/vismaAdapter.ts`)

- `exportInvoice(payload)` - Stub implementation:
  - **Deterministic failure**: If `customerName` contains "FAIL", throws error
  - **Success**: Returns `externalRef` like `VISMA-{invoiceId}-{timestamp}`
- `buildPayload(invoice, lines)` - Builds Visma payload from invoice data

## Backend Endpoints

### `POST /billing/invoices/:id/export/visma`
**Required role:** FINANCE or ADMIN

**Request:** (no body required)

**Response:**
```json
{
  "id": "export-123",
  "invoiceId": "inv-123",
  "targetSystem": "VISMA",
  "status": "PENDING",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Error (400) if references missing:**
```json
{
  "error": "Failed to queue Visma export",
  "message": "Cannot export invoice inv-123: reference1 and reference2 are required"
}
```

### `POST /billing/invoices/:id/export/visma/retry`
**Required role:** FINANCE or ADMIN

**Request:** (no body required)

**Response:** Updated export record (status=PENDING)

### `GET /billing/invoices/:id/exports`
**Required role:** FINANCE or ADMIN

**Response:**
```json
{
  "exports": [
    {
      "id": "export-123",
      "invoiceId": "inv-123",
      "targetSystem": "VISMA",
      "status": "SENT",
      "externalRef": "VISMA-abc12345-1705315200000",
      "lastError": null,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:05Z"
    }
  ]
}
```

## Visma Payload Format

The `VismaInvoicePayload` sent to Visma adapter:

```json
{
  "invoiceId": "inv-123",
  "customerName": "John Doe",
  "reference1": "REF-001",
  "reference2": "REF-002",
  "lines": [
    {
      "description": "Room stay (2 nights)",
      "quantity": 2,
      "unitPrice": 1000.00,
      "vatCode": "VAT_15"
    },
    {
      "description": "Breakfast × 24",
      "quantity": 24,
      "unitPrice": 150.00,
      "vatCode": "VAT_15"
    }
  ],
  "totals": {
    "subtotal": 2000.00,
    "vatTotal": 300.00,
    "total": 2300.00
  },
  "currency": "NOK"
}
```

## Audit Events

All export operations create audit logs:

### Export Queued
- **Action**: `VISMA_EXPORT_QUEUED`
- **Message**: "Visma export queued for invoice INV-123"

### Export Sent
- **Action**: `VISMA_EXPORT_SENT`
- **Message**: "Visma export sent for invoice INV-123 (ref: VISMA-abc12345-1705315200000)"
- **Metadata**: `{ vismaRef: "VISMA-..." }`

### Export Failed
- **Action**: `VISMA_EXPORT_FAILED`
- **Message**: "Visma export failed for invoice INV-123: <error message>"
- **Metadata**: `{ retryCount: 5, terminal: true }`

### Retry Scheduled
- **Action**: `OUTBOX_EVENT_RETRY`
- **Message**: "Visma export retry scheduled for invoice INV-123 (attempt 2/5): <error>"
- **Metadata**: `{ retryCount: 2, nextRetryAt: "2025-01-15T10:01:00Z" }`

## Outbox Processor

The processor runs automatically every 10 seconds:

1. Fetches pending events (status=PENDING, next_retry_at <= now)
2. Marks as PROCESSING
3. Routes to handler (VISMA_EXPORT_INVOICE → VismaAdapter)
4. On success: Updates accounting_exports (status=SENT, externalRef)
5. On failure: Schedules retry or marks as FAILED

## Manual Testing Steps

### 1. Create Invoice with Normal Customer Name

```bash
# Create invoice
curl -X POST http://localhost:3001/billing/invoices/from-reservation/res-123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE" \
  -d '{
    "customerName": "John Doe",
    "reference1": "REF-001",
    "reference2": "REF-002",
    "nightlyRate": 1000.00
  }'
```

**Response:** Invoice ID "inv-123"

### 2. Export Invoice (Should Succeed)

```bash
curl -X POST http://localhost:3001/billing/invoices/inv-123/export/visma \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Response:**
```json
{
  "id": "export-123",
  "invoiceId": "inv-123",
  "status": "PENDING"
}
```

**Wait 10-15 seconds for processor to run, then check status:**

```bash
curl http://localhost:3001/billing/invoices/inv-123/exports \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Status = "SENT", externalRef = "VISMA-..."

### 3. Create Invoice with "FAIL" in Customer Name (Should Fail)

```bash
# Create invoice with FAIL in name
curl -X POST http://localhost:3001/billing/invoices/from-reservation/res-124 \
  -H "Content-Type: application/json" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE" \
  -d '{
    "customerName": "FAIL TEST Customer",
    "reference1": "REF-003",
    "reference2": "REF-004",
    "nightlyRate": 1000.00
  }'
```

**Response:** Invoice ID "inv-124"

### 4. Export Invoice (Should Fail and Retry)

```bash
curl -X POST http://localhost:3001/billing/invoices/inv-124/export/visma \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Wait 1 minute, then check status:**

```bash
curl http://localhost:3001/billing/invoices/inv-124/exports \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Status = "FAILED" (after 5 retries), lastError = "Visma export failed: Customer name contains \"FAIL\"..."

### 5. Verify Database State

```sql
-- Check outbox events
SELECT id, event_type, status, retry_count, last_error, next_retry_at
FROM integration_outbox
WHERE entity_id IN ('inv-123', 'inv-124')
ORDER BY created_at DESC;

-- Expected:
-- inv-123: status=SUCCEEDED, retry_count=0
-- inv-124: status=FAILED, retry_count=5, last_error contains "FAIL"

-- Check accounting exports
SELECT invoice_id, status, external_ref, last_error
FROM accounting_exports
WHERE invoice_id IN ('inv-123', 'inv-124');

-- Expected:
-- inv-123: status=SENT, external_ref=VISMA-...
-- inv-124: status=FAILED, last_error contains "FAIL"
```

### 6. Verify Audit Logs

```sql
SELECT action, entity_type, entity_id, message, created_at
FROM audit_logs
WHERE entity_id IN ('inv-123', 'inv-124')
  AND action LIKE 'VISMA%'
ORDER BY created_at DESC;

-- Expected entries:
-- VISMA_EXPORT_QUEUED (for both invoices)
-- VISMA_EXPORT_SENT (for inv-123)
-- OUTBOX_EVENT_RETRY (for inv-124, multiple times)
-- VISMA_EXPORT_FAILED (for inv-124, after 5 retries)
```

### 7. Test Retry Endpoint

```bash
# Retry failed export
curl -X POST http://localhost:3001/billing/invoices/inv-124/export/visma/retry \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Export status reset to PENDING, new outbox event queued

## Retry/Backoff Details

### How Retries Work

1. **First Failure**: Event status = PENDING, retry_count = 1, next_retry_at = now + 1 minute
2. **Second Failure**: Event status = PENDING, retry_count = 2, next_retry_at = now + 5 minutes
3. **Third Failure**: Event status = PENDING, retry_count = 3, next_retry_at = now + 15 minutes
4. **Fourth Failure**: Event status = PENDING, retry_count = 4, next_retry_at = now + 1 hour
5. **Fifth Failure**: Event status = PENDING, retry_count = 5, next_retry_at = now + 1 hour
6. **Sixth Failure**: Event status = FAILED (terminal), no more retries

### Processor Behavior

- Processor runs every 10 seconds
- Only processes events where:
  - `status = 'PENDING'`
  - `next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP`
- Marks event as PROCESSING before processing
- Updates status to SUCCEEDED or FAILED after processing

## Files Changed

### Backend
- `migrations/007_create_outbox_and_exports.sql` (NEW)
- `backend/src/models/outbox.ts` (NEW)
- `backend/src/db/outboxQueries.ts` (NEW)
- `backend/src/adapters/vismaAdapter.ts` (NEW)
- `backend/src/services/outboxService.ts` (NEW)
- `backend/src/services/outboxProcessor.ts` (NEW)
- `backend/src/services/billingExportService.ts` (NEW)
- `backend/src/controllers/billingController.ts` (UPDATED - added export endpoints)
- `backend/src/server.ts` (UPDATED - added routes + processor startup)

### Documentation
- `docs/visma-export-implementation.md` (NEW)
- `migrations/README.md` (UPDATED)

## Sample Audit Log Entries

### Export Queued
```json
{
  "action": "VISMA_EXPORT_QUEUED",
  "entityType": "INVOICE",
  "entityId": "inv-123",
  "message": "Visma export queued for invoice inv-123",
  "after": {
    "exportId": "export-123",
    "status": "PENDING"
  }
}
```

### Export Sent
```json
{
  "action": "VISMA_EXPORT_SENT",
  "entityType": "INVOICE",
  "entityId": "inv-123",
  "message": "Visma export sent for invoice inv-123 (ref: VISMA-abc12345-1705315200000)",
  "after": {
    "externalRef": "VISMA-abc12345-1705315200000",
    "status": "SENT"
  },
  "metadata": {
    "vismaRef": "VISMA-abc12345-1705315200000"
  }
}
```

### Retry Scheduled
```json
{
  "action": "OUTBOX_EVENT_RETRY",
  "entityType": "OUTBOX",
  "entityId": "outbox-123",
  "message": "Visma export retry scheduled for invoice inv-124 (attempt 2/5): Visma export failed: Customer name contains \"FAIL\"",
  "metadata": {
    "invoiceId": "inv-124",
    "retryCount": 2,
    "nextRetryAt": "2025-01-15T10:05:00Z"
  }
}
```

### Export Failed
```json
{
  "action": "VISMA_EXPORT_FAILED",
  "entityType": "INVOICE",
  "entityId": "inv-124",
  "message": "Visma export failed for invoice inv-124: Visma export failed: Customer name contains \"FAIL\" (test failure)",
  "metadata": {
    "outboxEventId": "outbox-124",
    "retryCount": 5,
    "terminal": true
  }
}
```

## Next Steps

1. Replace stub adapter with real Visma API integration
2. Implement confirmation webhook (update status to CONFIRMED when Visma confirms)
3. Add export history UI in frontend
4. Add retry button in frontend for failed exports
5. Add monitoring/alerting for failed exports

