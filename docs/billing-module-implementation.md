# Billing Module Implementation

## Overview

This document describes the backend implementation for the core billing module, including invoice generation from reservations, invoice lines (ROOM, MEAL, FEE), payments, and full audit logging.

## Schema Changes

### Migration: `006_create_billing.sql`

Creates three tables:

1. **`invoices`** table:
   - `id` (uuid primary key)
   - `reservation_id` (references reservations, nullable)
   - `booking_group_id` (nullable, for future use)
   - `customer_name` (text, NOT NULL - temporary until customer table exists)
   - `status` (DRAFT, SENT, PAID, VOID)
   - `reference1`, `reference2` (text, NOT NULL, default '')
   - `currency` (default 'NOK')
   - `subtotal`, `vat_total`, `total` (numeric, default 0)
   - `created_by` (nullable)
   - `created_at`, `updated_at`

2. **`invoice_lines`** table:
   - `id` (uuid primary key)
   - `invoice_id` (references invoices, CASCADE delete)
   - `source_type` (ROOM, MEAL, FEE)
   - `source_id` (nullable, required for ROOM/MEAL)
   - `description` (text, NOT NULL)
   - `quantity`, `unit_price` (numeric)
   - `vat_code` (VAT_0, VAT_15, VAT_25)
   - `vat_amount`, `line_total` (calculated)
   - `created_at`, `updated_at`
   - **UNIQUE constraint**: `(invoice_id, source_type, source_id)` for idempotency

3. **`payments`** table:
   - `id` (uuid primary key)
   - `invoice_id` (references invoices, CASCADE delete)
   - `method` (PAYMENT_LINK, NETS_TERMINAL)
   - `status` (PENDING, SUCCEEDED, FAILED, CANCELLED)
   - `amount`, `currency` (default 'NOK')
   - `external_ref` (nullable, for payment link ID or transaction ID)
   - `created_at`, `updated_at`

**Indexes:**
- `invoices(status, created_at)` - for status filtering
- `invoices(reservation_id)` - for reservation-linked queries
- `invoice_lines(invoice_id)` - for line lookups
- `payments(invoice_id, status)` - for payment queries

## Backend Services

### `BillingService` (`backend/src/services/billingService.ts`)

Handles billing operations:

1. **`createInvoiceFromReservation(reservationId, input)`**
   - **Idempotent**: If invoice exists for reservation, returns existing invoice
   - Creates invoice with DRAFT status
   - Adds ROOM line:
     - Calculates nights from reservation dates
     - Uses `nightlyRate` from input (defaults to 0 if not provided - finance must edit)
     - VAT code: VAT_15 (assumption: room VAT is 15%)
   - Adds MEAL lines:
     - Finds meal_orders where `reservation_id = reservationId` and `status != CANCELLED`
     - Joins kitchen_items for unit_price and vat_code
     - Creates lines with `source_type=MEAL`, `source_id=meal_order_id`
     - Respects VAT codes from kitchen items (VAT_15 or VAT_25)
   - Recalculates totals
   - Logs audit: `INVOICE_CREATED_FROM_RESERVATION`

2. **`recalculateInvoiceTotals(invoiceId)`**
   - Sums all invoice_lines
   - Updates invoice subtotal, vat_total, total

3. **`addFeeLine(invoiceId, input)`**
   - Adds manual fee line (source_type=FEE, no source_id)
   - Only allowed for DRAFT invoices
   - Recalculates totals
   - Logs audit: `INVOICE_LINE_ADDED`

4. **`removeInvoiceLine(lineId)`**
   - Removes line (only DRAFT invoices)
   - Recalculates totals
   - Logs audit: `INVOICE_LINE_REMOVED`

5. **`markInvoiceSent(invoiceId)`**
   - Changes status: DRAFT → SENT
   - Logs audit: `INVOICE_STATUS_CHANGED`

6. **`markInvoicePaid(invoiceId)`**
   - Changes status: SENT/PAID → PAID
   - Logs audit: `INVOICE_STATUS_CHANGED`

7. **`voidInvoice(invoiceId, reason)`**
   - Changes status to VOID (cannot void PAID invoices)
   - Logs audit: `INVOICE_STATUS_CHANGED` with reason

8. **`createPaymentLink(invoiceId, input)`**
   - Creates payment record (method=PAYMENT_LINK, status=PENDING)
   - Generates stub external_ref
   - Logs audit: `PAYMENT_CREATED`

9. **`initiateNetsTerminal(invoiceId, input)`**
   - Creates payment record (method=NETS_TERMINAL, status=PENDING)
   - Generates stub external_ref
   - Logs audit: `PAYMENT_CREATED`

## Backend Endpoints

### Invoice Endpoints

#### `POST /billing/invoices/from-reservation/:reservationId`
**Required role:** FINANCE or BOOKING_STAFF or ADMIN

**Request:**
```json
{
  "customerName": "John Doe",
  "reference1": "REF-001",
  "reference2": "REF-002",
  "nightlyRate": 1000.00
}
```

**Response:**
```json
{
  "id": "inv-123",
  "reservationId": "res-123",
  "customerName": "John Doe",
  "status": "DRAFT",
  "reference1": "REF-001",
  "reference2": "REF-002",
  "currency": "NOK",
  "subtotal": 2000.00,
  "vatTotal": 300.00,
  "total": 2300.00,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Idempotent behavior:** If invoice already exists for reservation, returns existing invoice (no duplicate lines).

#### `GET /billing/invoices/:id`
**Required role:** FINANCE or ADMIN

**Response:**
```json
{
  "invoice": {
    "id": "inv-123",
    "reservationId": "res-123",
    "customerName": "John Doe",
    "status": "DRAFT",
    "reference1": "REF-001",
    "reference2": "REF-002",
    "subtotal": 2000.00,
    "vatTotal": 300.00,
    "total": 2300.00
  },
  "lines": [
    {
      "id": "line-1",
      "sourceType": "ROOM",
      "sourceId": "res-123",
      "description": "Room stay (2 nights)",
      "quantity": 2,
      "unitPrice": 1000.00,
      "vatCode": "VAT_15",
      "vatAmount": 300.00,
      "lineTotal": 2300.00
    },
    {
      "id": "line-2",
      "sourceType": "MEAL",
      "sourceId": "order-1",
      "description": "Breakfast × 24",
      "quantity": 24,
      "unitPrice": 150.00,
      "vatCode": "VAT_15",
      "vatAmount": 540.00,
      "lineTotal": 4140.00
    }
  ],
  "payments": []
}
```

#### `PATCH /billing/invoices/:id`
**Required role:** FINANCE or ADMIN

**Request:**
```json
{
  "reference1": "Updated-REF-001",
  "reference2": "Updated-REF-002"
}
```

**Response:** Updated invoice

**Error (400) if invoice is not DRAFT:**
```json
{
  "error": "Failed to update invoice",
  "message": "Cannot update invoice inv-123: invoice is SENT, only DRAFT invoices can be updated"
}
```

#### `POST /billing/invoices/:id/fee-line`
**Required role:** FINANCE or ADMIN

**Request:**
```json
{
  "description": "Late checkout fee",
  "quantity": 1,
  "unitPrice": 500.00,
  "vatCode": "VAT_25"
}
```

**Response:** Created invoice line

#### `DELETE /billing/invoices/:id/lines/:lineId`
**Required role:** FINANCE or ADMIN

**Response:**
```json
{
  "success": true,
  "message": "Invoice line removed"
}
```

#### `POST /billing/invoices/:id/mark-sent`
**Required role:** FINANCE or ADMIN

**Response:** Updated invoice (status = SENT)

#### `POST /billing/invoices/:id/mark-paid`
**Required role:** FINANCE or ADMIN

**Response:** Updated invoice (status = PAID)

#### `POST /billing/invoices/:id/void`
**Required role:** FINANCE or ADMIN

**Request:**
```json
{
  "reason": "Customer cancelled"
}
```

**Response:** Updated invoice (status = VOID)

### Payment Endpoints

#### `POST /billing/invoices/:id/payment-link`
**Required role:** FINANCE or ADMIN

**Request:**
```json
{
  "amount": 2300.00
}
```

**Response:**
```json
{
  "id": "pay-123",
  "invoiceId": "inv-123",
  "method": "PAYMENT_LINK",
  "status": "PENDING",
  "amount": 2300.00,
  "currency": "NOK",
  "externalRef": "paylink-abc12345",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### `POST /billing/invoices/:id/nets-terminal/initiate`
**Required role:** FINANCE or ADMIN

**Request:**
```json
{
  "amount": 2300.00
}
```

**Response:**
```json
{
  "id": "pay-124",
  "invoiceId": "inv-123",
  "method": "NETS_TERMINAL",
  "status": "PENDING",
  "amount": 2300.00,
  "currency": "NOK",
  "externalRef": "nets-xyz67890",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

## Assumptions

1. **Room Pricing:**
   - No pricing model/rate codes exist yet
   - `nightlyRate` is accepted as input parameter when creating invoice
   - If `nightlyRate` is not provided, defaults to 0 (finance must edit manually)
   - **Assumption:** Room VAT is 15% (VAT_15)

2. **Customer Information:**
   - No customer table exists yet
   - `customerName` is stored directly on invoice
   - Future: Can migrate to customer_id when customer table is implemented

3. **Booking Groups:**
   - `booking_group_id` column exists but group invoicing is not implemented yet
   - Current implementation only supports reservation-level invoicing

4. **Idempotency:**
   - If invoice already exists for a reservation, returns existing invoice
   - Invoice lines use UNIQUE constraint `(invoice_id, source_type, source_id)` to prevent duplicates
   - Re-running `createInvoiceFromReservation` will not create duplicate lines

## Audit Events

All mutations create audit logs with human-readable messages:

### Invoices
- **INVOICE_CREATED_FROM_RESERVATION**: "Invoice created from reservation res-123 (2 nights, 1 meal orders)"
- **INVOICE_REFERENCE_UPDATED**: "Invoice references updated: ref1=\"REF-001\", ref2=\"REF-002\""
- **INVOICE_STATUS_CHANGED**: "Invoice status changed: DRAFT → SENT" or "Invoice voided: Customer cancelled"

### Invoice Lines
- **INVOICE_LINE_ADDED**: "Fee line added to invoice inv-123: Late checkout fee (1 × 500.00 NOK, VAT VAT_25)"
- **INVOICE_LINE_REMOVED**: "Invoice line removed from invoice inv-123: Late checkout fee"

### Payments
- **PAYMENT_CREATED**: "Payment link created for invoice inv-123 (amount: 2300 NOK)" or "NETS terminal payment initiated for invoice inv-123 (amount: 2300 NOK)"

## Frontend Integration

### `billingApiService.ts`

Frontend service providing:
- `createInvoiceFromReservation(reservationId, input)` - POST /billing/invoices/from-reservation/:id
- `getInvoice(invoiceId)` - GET /billing/invoices/:id
- `updateInvoice(invoiceId, input)` - PATCH /billing/invoices/:id
- `addFeeLine(invoiceId, input)` - POST /billing/invoices/:id/fee-line
- `removeInvoiceLine(invoiceId, lineId)` - DELETE /billing/invoices/:id/lines/:lineId
- `markInvoiceSent(invoiceId)` - POST /billing/invoices/:id/mark-sent
- `markInvoicePaid(invoiceId)` - POST /billing/invoices/:id/mark-paid
- `voidInvoice(invoiceId, reason)` - POST /billing/invoices/:id/void
- `createPaymentLink(invoiceId, amount?)` - POST /billing/invoices/:id/payment-link
- `initiateNetsTerminal(invoiceId, amount?)` - POST /billing/invoices/:id/nets-terminal/initiate

## Manual Testing Steps

### 1. Create Invoice from Reservation

```bash
# First, ensure reservation exists and has meal orders
# Then create invoice
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

**Response:** Invoice with id "inv-123"

### 2. Verify Invoice Lines

```bash
curl http://localhost:3001/billing/invoices/inv-123 \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Invoice with ROOM line and MEAL lines (if meal orders exist)

### 3. Test Idempotency

```bash
# Run createInvoiceFromReservation again
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

**Expected:** Returns same invoice (no duplicate lines created)

**Verify in database:**
```sql
-- Check invoice lines count
SELECT COUNT(*) FROM invoice_lines WHERE invoice_id = 'inv-123';
-- Should be same count as before (no duplicates)

-- Check unique constraint prevents duplicates
SELECT invoice_id, source_type, source_id, COUNT(*) 
FROM invoice_lines 
WHERE invoice_id = 'inv-123'
GROUP BY invoice_id, source_type, source_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### 4. Add Fee Line

```bash
curl -X POST http://localhost:3001/billing/invoices/inv-123/fee-line \
  -H "Content-Type: application/json" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE" \
  -d '{
    "description": "Late checkout fee",
    "quantity": 1,
    "unitPrice": 500.00,
    "vatCode": "VAT_25"
  }'
```

### 5. Verify Totals Recalculated

```bash
curl http://localhost:3001/billing/invoices/inv-123 \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Invoice totals updated (subtotal, vatTotal, total)

### 6. Mark Invoice as Sent

```bash
curl -X POST http://localhost:3001/billing/invoices/inv-123/mark-sent \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

### 7. Create Payment Link

```bash
curl -X POST http://localhost:3001/billing/invoices/inv-123/payment-link \
  -H "Content-Type: application/json" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE" \
  -d '{"amount": 2300.00}'
```

### 8. Verify Audit Logs

```sql
-- Check audit logs for billing operations
SELECT action, entity_type, entity_id, message, created_at
FROM audit_logs
WHERE entity_type IN ('INVOICE', 'INVOICE_LINE', 'PAYMENT')
ORDER BY created_at DESC
LIMIT 10;

-- Expected entries:
-- INVOICE_CREATED_FROM_RESERVATION (entity_type=INVOICE, entity_id=inv-123)
-- INVOICE_LINE_ADDED (entity_type=INVOICE_LINE, for fee line)
-- INVOICE_STATUS_CHANGED (entity_type=INVOICE, status DRAFT → SENT)
-- PAYMENT_CREATED (entity_type=PAYMENT, method=PAYMENT_LINK)
```

## Sample Audit Log Entries

### Invoice Created
```json
{
  "action": "INVOICE_CREATED_FROM_RESERVATION",
  "entityType": "INVOICE",
  "entityId": "inv-123",
  "message": "Invoice created from reservation res-123 (2 nights, 1 meal orders)",
  "after": {
    "reservationId": "res-123",
    "customerName": "John Doe",
    "subtotal": 2000.00,
    "vatTotal": 300.00,
    "total": 2300.00
  },
  "metadata": {
    "reservationId": "res-123",
    "nightlyRate": 1000.00,
    "mealOrderCount": 1
  }
}
```

### Fee Line Added
```json
{
  "action": "INVOICE_LINE_ADDED",
  "entityType": "INVOICE_LINE",
  "entityId": "line-3",
  "message": "Fee line added to invoice inv-123: Late checkout fee (1 × 500.00 NOK, VAT VAT_25)",
  "after": {
    "invoiceId": "inv-123",
    "sourceType": "FEE",
    "description": "Late checkout fee",
    "quantity": 1,
    "unitPrice": 500.00,
    "vatCode": "VAT_25"
  }
}
```

### Status Changed
```json
{
  "action": "INVOICE_STATUS_CHANGED",
  "entityType": "INVOICE",
  "entityId": "inv-123",
  "message": "Invoice status changed: DRAFT → SENT",
  "before": {
    "status": "DRAFT"
  },
  "after": {
    "status": "SENT"
  }
}
```

### Payment Created
```json
{
  "action": "PAYMENT_CREATED",
  "entityType": "PAYMENT",
  "entityId": "pay-123",
  "message": "Payment link created for invoice inv-123 (amount: 2300 NOK)",
  "after": {
    "invoiceId": "inv-123",
    "method": "PAYMENT_LINK",
    "amount": 2300.00,
    "status": "PENDING",
    "externalRef": "paylink-abc12345"
  }
}
```

## Files Changed

### Backend
- `migrations/006_create_billing.sql` (NEW)
- `backend/src/models/billing.ts` (NEW)
- `backend/src/db/billingQueries.ts` (NEW)
- `backend/src/services/billingService.ts` (NEW)
- `backend/src/controllers/billingController.ts` (NEW)
- `backend/src/server.ts` (UPDATED - added routes)

### Frontend
- `services/billingApiService.ts` (NEW)

### Documentation
- `docs/billing-module-implementation.md` (NEW)
- `migrations/README.md` (UPDATED)

## Next Steps

1. Wire frontend BillingView to use `billingApiService` for invoice operations
2. Implement customer table and migrate `customerName` to `customer_id`
3. Implement booking group invoicing (when booking groups table exists)
4. Add rate codes/pricing model for automatic room pricing
5. Integrate with actual payment providers (payment link generation, NETS terminal)

