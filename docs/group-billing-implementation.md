# Group Billing Implementation

## Overview

This document describes the implementation of "Create from Group" functionality for billing, allowing finance staff to create invoices from multiple reservations grouped together.

## Database Changes

### Migration: `009_create_booking_groups.sql`

1. **Creates `booking_groups` table:**
   - `id` (VARCHAR(255) PRIMARY KEY)
   - `customer_name` (TEXT NOT NULL)
   - `reference1`, `reference2` (TEXT, nullable)
   - `title` (TEXT, nullable)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **Adds `reservation_id` to `invoice_lines` table:**
   - For traceability back to the source reservation
   - Nullable (for FEE lines that don't have a reservation)

3. **Indexes:**
   - `idx_booking_groups_customer` on `customer_name`
   - `idx_invoice_lines_reservation` on `reservation_id` (where not null)
   - `idx_reservations_booking_group` on `booking_group_id` (where not null)

## Backend Implementation

### Files Created

1. **`backend/src/db/groupBillingQueries.ts`**
   - `getGroupsForInvoicing()` - Returns groups suitable for invoicing with summary data
   - `getBookingGroupById()` - Get group details
   - `getInvoiceByBookingGroupId()` - Check for existing invoice (idempotency)

2. **`backend/src/services/groupBillingService.ts`**
   - `getGroupsForInvoicing()` - List groups with filters
   - `getGroupInvoicePreview()` - Preview invoice before creation
   - `createInvoiceFromGroup()` - Create invoice (idempotent)

### Files Modified

1. **`backend/src/db/billingQueries.ts`**
   - Updated `createInvoiceLine()` to accept `reservationId` parameter
   - Updated `getInvoiceLines()` to return `reservationId`

2. **`backend/src/models/billing.ts`**
   - Added `reservationId?: string` to `InvoiceLine` interface

3. **`backend/src/controllers/billingController.ts`**
   - Added `getGroupsForInvoicing()` endpoint handler
   - Added `getGroupInvoicePreview()` endpoint handler
   - Added `createInvoiceFromGroup()` endpoint handler

4. **`backend/src/server.ts`**
   - Added routes:
     - `GET /billing/groups`
     - `GET /billing/groups/:groupId/preview`
     - `POST /billing/invoices/from-group/:groupId`

## Frontend Implementation

### Files Modified

1. **`services/billingApiService.ts`**
   - Added `getGroupsForInvoicing()`
   - Added `getGroupInvoicePreview()`
   - Added `createInvoiceFromGroup()`
   - Added TypeScript interfaces for group billing

2. **`components/Views.tsx`**
   - Completely refactored `CreateInvoiceModal` with 3-step workflow:
     - Step 1: Select group (with search)
     - Step 2: Preview (reservations, meal orders, totals, inputs)
     - Step 3: Create (handled in step 2)

## API Endpoints

### GET /billing/groups

**Query Parameters:**
- `from` (optional) - Filter by start date
- `to` (optional) - Filter by end date
- `q` (optional) - Search query

**Response:**
```json
{
  "groups": [
    {
      "groupId": "group-123",
      "title": "NASA Operations Week 3",
      "reference1": "REF-001",
      "reference2": "REF-002",
      "customerName": "NASA",
      "reservationCount": 5,
      "dateRange": {
        "minStartDate": "2025-01-15",
        "maxEndDate": "2025-01-22"
      },
      "estimatedTotal": 50000
    }
  ]
}
```

### GET /billing/groups/:groupId/preview?nightlyRate=1000

**Response:**
```json
{
  "group": {
    "id": "group-123",
    "customerName": "NASA",
    "reference1": "REF-001",
    "reference2": "REF-002",
    "title": "NASA Operations Week 3"
  },
  "reservations": {
    "included": [
      {
        "id": "res-1",
        "roomId": "room-101",
        "roomNumber": "101",
        "startDate": "2025-01-15",
        "endDate": "2025-01-18",
        "customerName": "NASA",
        "nights": 3
      }
    ],
    "excluded": [
      {
        "id": "res-2",
        "reason": "Reservation is cancelled"
      }
    ]
  },
  "mealOrders": [
    {
      "id": "meal-1",
      "reservationId": "res-1",
      "kitchenItemName": "Breakfast Buffet",
      "quantity": 24,
      "unitPrice": 150,
      "vatCode": "VAT_15",
      "orderDateTime": "2025-01-15T08:00:00Z"
    }
  ],
  "linesPreview": [
    {
      "type": "ROOM",
      "sourceId": "res-1",
      "description": "Room 101 (3 nights)",
      "quantity": 3,
      "unitPrice": 1000,
      "vatCode": "VAT_15",
      "lineTotal": 3450
    },
    {
      "type": "MEAL",
      "sourceId": "meal-1",
      "description": "Breakfast Buffet × 24",
      "quantity": 24,
      "unitPrice": 150,
      "vatCode": "VAT_15",
      "lineTotal": 4140
    }
  ],
  "totals": {
    "subtotal": 6600,
    "vatTotal": 990,
    "total": 7590
  },
  "validation": {
    "mixedCustomers": false,
    "missingReferences": false,
    "existingInvoiceId": null
  }
}
```

### POST /billing/invoices/from-group/:groupId

**Request Body:**
```json
{
  "reference1": "REF-001",
  "reference2": "REF-002",
  "nightlyRate": 1000
}
```

**Response:**
```json
{
  "id": "inv-123",
  "bookingGroupId": "group-123",
  "customerName": "NASA",
  "status": "DRAFT",
  "reference1": "REF-001",
  "reference2": "REF-002",
  "currency": "NOK",
  "subtotal": 6600,
  "vatTotal": 990,
  "total": 7590,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

## Idempotency

- If an invoice already exists for a `booking_group_id`, the creation endpoint returns the existing invoice
- Invoice lines use unique constraint `(invoice_id, source_type, source_id)` to prevent duplicates
- Creating the same invoice twice results in the same invoice ID

## Validation Rules

1. **Mixed Customers:** Cannot create invoice if group contains reservations with different customers
2. **Missing References:** Warning shown in preview, but creation is allowed (Visma export will require them)
3. **Excluded Reservations:** Cancelled or already-invoiced reservations are excluded with reason

## Audit Logging

All group invoice creation is logged with:
- Action: `INVOICE_CREATED_FROM_GROUP`
- Entity Type: `INVOICE`
- Message: "Invoice created from group \"{title}\" ({n} reservations, {m} meal orders)"
- Metadata includes: bookingGroupId, nightlyRate, reservationIds, mealOrderIds

## Manual Testing Steps

### 1. Create Booking Group (via database)

```sql
INSERT INTO booking_groups (id, customer_name, title, reference1, reference2)
VALUES ('group-123', 'NASA', 'NASA Operations Week 3', 'REF-001', 'REF-002');
```

### 2. Link Reservations to Group

```sql
UPDATE reservations 
SET booking_group_id = 'group-123' 
WHERE id IN ('res-1', 'res-2', 'res-3');
```

### 3. Test Preview Endpoint

```bash
curl -X GET "http://localhost:3001/billing/groups/group-123/preview?nightlyRate=1000" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

### 4. Test Create Endpoint

```bash
curl -X POST "http://localhost:3001/billing/invoices/from-group/group-123" \
  -H "Content-Type: application/json" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE" \
  -d '{
    "reference1": "REF-001",
    "reference2": "REF-002",
    "nightlyRate": 1000
  }'
```

### 5. Test Idempotency

Run the create endpoint again - should return the same invoice ID.

### 6. Verify Invoice Lines

```sql
SELECT * FROM invoice_lines WHERE invoice_id = 'inv-123';
-- Should show ROOM and MEAL lines with reservation_id populated
```

### 7. Test Frontend Flow

1. Navigate to Billing page
2. Click "Create from Group"
3. Search and select a group
4. Review preview (reservations, meal orders, totals)
5. Fill in Reference 1, Reference 2, and Nightly Rate
6. Click "Create Draft Invoice"
7. Verify invoice is created and detail view opens

## Sample Audit Log Entry

```json
{
  "id": "audit-123",
  "action": "INVOICE_CREATED_FROM_GROUP",
  "entityType": "INVOICE",
  "entityId": "inv-123",
  "userId": "finance-1",
  "message": "Invoice created from group \"NASA Operations Week 3\" (5 reservations, 12 meal orders)",
  "after": {
    "bookingGroupId": "group-123",
    "customerName": "NASA",
    "reservationCount": 5,
    "mealOrderCount": 12,
    "subtotal": 6600,
    "vatTotal": 990,
    "total": 7590
  },
  "metadata": {
    "bookingGroupId": "group-123",
    "nightlyRate": 1000,
    "reservationIds": ["res-1", "res-2", "res-3", "res-4", "res-5"],
    "mealOrderIds": ["meal-1", "meal-2", ...]
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## Notes

- The `booking_groups` table is created but groups must be populated manually or via a future booking creation flow
- Nightly rate is required until a pricing model is implemented
- VAT codes: Rooms use VAT_15, Meal orders use VAT from kitchen_items
- All invoice lines include `reservation_id` for traceability (except FEE lines)

