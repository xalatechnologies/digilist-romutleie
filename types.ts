
export enum UserRole {
  ADMIN = 'ADMIN',
  BOOKING_STAFF = 'BOOKING_STAFF',
  HOUSEKEEPING = 'HOUSEKEEPING',
  KITCHEN = 'KITCHEN',
  FINANCE = 'FINANCE',
  VIEWER = 'VIEWER'
}

export enum RoomType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  APARTMENT = 'Apartment'
}

export enum RoomStatus {
  CLEAN = 'CLEAN',
  DIRTY = 'DIRTY',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum RoomOccupancy {
  FREE = 'FREE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  DEPARTING = 'DEPARTING'
}

export interface IRoom {
  id: string;
  number: string;
  type: RoomType;
  capacity: number;
  floor: number;
  pricePerNight: number;
  status: RoomStatus;
  outOfServiceReason?: string; // New field
  outOfServiceNote?: string;
  expectedReturnDate?: string;
  linkedTicketId?: string;
}

// Helper interface for frontend display
export interface IRoomSummary extends IRoom {
  occupancy: RoomOccupancy;
  nextEvent: string;
  hasHousekeeping: boolean;
  hasMaintenance: boolean;
  currentBooking?: IBooking;
}

export enum BookingStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED'
}

export enum CustomerType {
  PERSON = 'Person',
  COMPANY = 'Company'
}

export enum PaymentMethod {
  PREPAYMENT = 'Prepayment',
  INVOICE = 'Pay by Invoice',
  PAYMENT_LINK = 'Payment Link',
  NETS = 'NETS Terminal'
}

export interface IExtraFee {
  id: string;
  description: string;
  amount: number;
  vatCode: 15 | 25;
}

export interface IBooking {
  id: string;
  // Section 1: Customer Info
  customerType: CustomerType;
  customerName: string; // Contact person
  companyName?: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: string;
  orgNumber?: string;
  reference1?: string;
  reference2?: string;

  // Section 2: Stay Details
  guestCount: number;
  roomId: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  checkInTime?: string;
  checkOutTime?: string;

  // Section 3: Booking Type
  bookingMode: 'Individual' | 'Group';
  groupName?: string;
  internalNotes?: string;

  // Section 4: Price & Agreement
  rateCode?: string;
  pricePerNightOverride?: number;
  discountPercentage?: number;
  
  // Section 5: Payment
  paymentMethod: PaymentMethod;
  cardGuaranteeRequired: boolean;
  cardGuaranteeRef?: string;

  // Ordering
  totalPrice: number;
  extraFees: IExtraFee[];
}

export enum VatCode {
  VAT_15 = 15,
  VAT_25 = 25
}

export enum MealOrderStatus {
  PLANNED = 'PLANNED',
  IN_PREP = 'IN_PREP',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface IKitchenItem {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  vatCode: VatCode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMealOrder {
  id: string;
  orderDateTime: string; // ISO date string
  quantity: number;
  kitchenItemId: string;
  servingLocation: string;
  referenceText?: string;
  notes?: string;
  status: MealOrderStatus;
  // Link fields (at least one required)
  bookingGroupId?: string;
  reservationId?: string;
  customerId?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHousekeepingTask {
  id: string;
  roomId: string;
  type: 'Turnover' | 'Stayover' | 'Deep Clean';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo?: string;
  dueDate: string;
}

export enum MaintenanceCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HVAC = 'HVAC',
  CLEANING_DEEP = 'CLEANING_DEEP',
  DAMAGE = 'DAMAGE',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER'
}

export enum MaintenanceSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum MaintenanceTicketStatus {
  OPEN = 'OPEN',
  TRIAGED = 'TRIAGED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum BlockReason {
  MAINTENANCE = 'Maintenance',
  DAMAGE = 'Damage',
  SAFETY_ISSUE = 'Safety issue',
  DEEP_CLEANING = 'Deep cleaning',
  ADMINISTRATIVE_BLOCK = 'Administrative block'
}

export interface IMaintenanceTicket {
  id: string;
  unitId: string; // roomId
  title: string;
  category: MaintenanceCategory;
  severity: MaintenanceSeverity;
  status: MaintenanceTicketStatus;
  description: string;
  reportedByUserId: string;
  assignedToUserId?: string;
  requestedAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  requiresBlocking: boolean;
  blockReason?: BlockReason;
  blockedAt?: Date;
  blockedByUserId?: string;
  linkedTicketId?: string; // For tracking which ticket caused blocking
}

export interface ITicketAttachment {
  id: string;
  ticketId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedByUserId: string;
  createdAt: Date;
}

// Legacy enum for backward compatibility
export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  VOID = 'VOID'
}

export enum PaymentMethodEnum {
  PAYMENT_LINK = 'PAYMENT_LINK',
  NETS_TERMINAL = 'NETS_TERMINAL'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AccountingExportStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CONFIRMED = 'CONFIRMED'
}

export enum InvoiceLineSourceType {
  ROOM = 'ROOM',
  MEAL = 'MEAL',
  FEE = 'FEE'
}

export interface IInvoice {
  id: string;
  bookingGroupId?: string; // Nullable if standalone, but prefer group
  customerId: string; // Required
  customerName: string; // For display
  status: InvoiceStatus;
  reference1: string; // REQUIRED
  reference2: string; // REQUIRED
  currency: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  issuedAt?: Date;
  dueDate?: Date;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceLine {
  id: string;
  invoiceId: string;
  sourceType: InvoiceLineSourceType;
  sourceId?: string; // Nullable but required for ROOM/MEAL to ensure idempotency
  description: string;
  quantity: number;
  unitPrice: number;
  vatCode: VatCode;
  vatAmount: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment {
  id: string;
  invoiceId: string;
  method: PaymentMethodEnum;
  status: PaymentStatus;
  amount: number;
  currency: string;
  externalRef?: string; // Payment link URL or NETS transaction ID
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountingExport {
  id: string;
  invoiceId: string;
  targetSystem: 'VISMA';
  status: AccountingExportStatus;
  externalRef?: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDailySummary {
  date: string;
  roomNights: number;
  totalRevenue: number;
  occupancyRate: number;
  closedAt: string;
}

export enum AuditEntityType {
  ROOM = 'ROOM',
  RESERVATION = 'RESERVATION',
  BOOKING_GROUP = 'BOOKING_GROUP',
  INVOICE = 'INVOICE',
  INVOICE_LINE = 'INVOICE_LINE',
  TICKET = 'TICKET',
  MEAL_ORDER = 'MEAL_ORDER',
  KITCHEN_ITEM = 'KITCHEN_ITEM',
  PAYMENT = 'PAYMENT',
  OUTBOX = 'OUTBOX',
  HOUSEKEEPING_TASK = 'HOUSEKEEPING_TASK',
  SYSTEM = 'SYSTEM'
}

export enum AuditAction {
  // Rooms
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_CONDITION_CHANGED = 'ROOM_CONDITION_CHANGED',
  ROOM_SET_OUT_OF_SERVICE = 'ROOM_SET_OUT_OF_SERVICE',
  ROOM_RESTORED_FROM_SERVICE = 'ROOM_RESTORED_FROM_SERVICE',
  
  // Bookings
  BOOKING_GROUP_CREATED = 'BOOKING_GROUP_CREATED',
  RESERVATION_CREATED = 'RESERVATION_CREATED',
  RESERVATION_UPDATED = 'RESERVATION_UPDATED',
  RESERVATION_STATUS_CHANGED = 'RESERVATION_STATUS_CHANGED',
  RESERVATION_CANCELLED = 'RESERVATION_CANCELLED',
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  
  // Housekeeping
  HOUSEKEEPING_MARKED_CLEAN = 'HOUSEKEEPING_MARKED_CLEAN',
  HOUSEKEEPING_MARKED_DIRTY = 'HOUSEKEEPING_MARKED_DIRTY',
  HOUSEKEEPING_ISSUE_REPORTED = 'HOUSEKEEPING_ISSUE_REPORTED',
  
  // Maintenance
  MAINTENANCE_TICKET_CREATED = 'MAINTENANCE_TICKET_CREATED',
  MAINTENANCE_TICKET_UPDATED = 'MAINTENANCE_TICKET_UPDATED',
  MAINTENANCE_TICKET_ASSIGNED = 'MAINTENANCE_TICKET_ASSIGNED',
  MAINTENANCE_TICKET_STATUS_CHANGED = 'MAINTENANCE_TICKET_STATUS_CHANGED',
  MAINTENANCE_TICKET_RESOLVED = 'MAINTENANCE_TICKET_RESOLVED',
  MAINTENANCE_BLOCK_TRIGGERED = 'MAINTENANCE_BLOCK_TRIGGERED',
  MAINTENANCE_BLOCK_REMOVED = 'MAINTENANCE_BLOCK_REMOVED',
  
  // Kitchen
  KITCHEN_ITEM_CREATED = 'KITCHEN_ITEM_CREATED',
  KITCHEN_ITEM_UPDATED = 'KITCHEN_ITEM_UPDATED',
  KITCHEN_ITEM_DEACTIVATED = 'KITCHEN_ITEM_DEACTIVATED',
  MEAL_ORDER_CREATED = 'MEAL_ORDER_CREATED',
  MEAL_ORDER_UPDATED = 'MEAL_ORDER_UPDATED',
  MEAL_ORDER_STATUS_CHANGED = 'MEAL_ORDER_STATUS_CHANGED',
  MEAL_ORDER_CANCELLED = 'MEAL_ORDER_CANCELLED',
  
  // Billing
  INVOICE_CREATED_FROM_GROUP = 'INVOICE_CREATED_FROM_GROUP',
  INVOICE_REFERENCE_UPDATED = 'INVOICE_REFERENCE_UPDATED',
  INVOICE_LINE_ADDED = 'INVOICE_LINE_ADDED',
  INVOICE_LINE_UPDATED = 'INVOICE_LINE_UPDATED',
  INVOICE_LINE_REMOVED = 'INVOICE_LINE_REMOVED',
  INVOICE_STATUS_CHANGED = 'INVOICE_STATUS_CHANGED',
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_STATUS_CHANGED = 'PAYMENT_STATUS_CHANGED',
  
  // Integrations
  VISMA_EXPORT_QUEUED = 'VISMA_EXPORT_QUEUED',
  VISMA_EXPORT_SENT = 'VISMA_EXPORT_SENT',
  VISMA_EXPORT_FAILED = 'VISMA_EXPORT_FAILED',
  VISMA_EXPORT_CONFIRMED = 'VISMA_EXPORT_CONFIRMED',
  OUTBOX_EVENT_RETRY = 'OUTBOX_EVENT_RETRY',
  
  // System
  SYSTEM_INIT = 'SYSTEM_INIT',
  NIGHT_AUDIT_RUN = 'NIGHT_AUDIT_RUN'
}

export interface IAuditLog {
  id: string;
  orgId?: string; // For multi-tenant (optional for now)
  actorUserId: string | null; // null for system jobs
  actorRoles: string[]; // Array of roles at time of action
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null; // null for system-wide events
  message: string; // Human-readable sentence
  before: any | null; // JSON snapshot before change
  after: any | null; // JSON snapshot after change
  metadata: {
    requestId?: string;
    ip?: string;
    correlationId?: string;
    affectedIds?: string[]; // For bulk actions
    [key: string]: any;
  } | null;
  createdAt: Date;
  
  // Legacy fields for backward compatibility
  timestamp?: Date;
  userId?: string;
  domain?: 'ROOM' | 'BOOKING' | 'KITCHEN' | 'BILLING' | 'SYSTEM' | 'PAYMENT';
  details?: string;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * Interface for tracking asynchronous integration events for the outbox pattern.
 */
export interface IOutboxEvent {
  id: string;
  eventType: string;
  payload: any;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
