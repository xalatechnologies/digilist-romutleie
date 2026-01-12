
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

export interface IRoom {
  id: string;
  number: string;
  type: RoomType;
  capacity: number;
  floor: number;
  pricePerNight: number;
  status: RoomStatus;
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

export interface IKitchenItem {
  id: string;
  name: string;
  price: number;
  vatCode: 15 | 25;
  active: boolean;
}

export interface IMealOrder {
  id: string;
  bookingId: string;
  date: string;
  type: string; // From catalog
  qty: number;
  status: 'Pending' | 'Served';
  itemId: string;
  servingLocation?: string;
  notes?: string;
}

export interface IHousekeepingTask {
  id: string;
  roomId: string;
  type: 'Turnover' | 'Stayover' | 'Deep Clean';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo?: string;
  dueDate: string;
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface IMaintenanceTicket {
  id: string;
  roomId: string;
  description: string;
  priority: MaintenancePriority;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: Date;
  imageUrl?: string;
}

export interface IPayment {
  id: string;
  invoiceId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentLink?: string;
  createdAt: Date;
}

export interface IInvoice {
  id: string;
  bookingId: string;
  customerName: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
  reference1: string;
  reference2: string;
  lines: IInvoiceLine[];
  paymentId?: string;
}

export interface IInvoiceLine {
  description: string;
  qty: number;
  price: number;
  vat: number;
}

export interface IDailySummary {
  date: string;
  roomNights: number;
  totalRevenue: number;
  occupancyRate: number;
  closedAt: string;
}

export interface IAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  domain: 'ROOM' | 'BOOKING' | 'KITCHEN' | 'BILLING' | 'SYSTEM' | 'PAYMENT';
  details: string;
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
  type: string;
  payload: any;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  attempts: number;
}
