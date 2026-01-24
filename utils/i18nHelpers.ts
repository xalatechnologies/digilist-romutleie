/**
 * i18n Helper Functions for Status/Enum Localization
 * 
 * These functions ensure all enum values are properly localized
 * and never displayed as raw enum strings in the UI.
 */

import { TFunction } from 'i18next';

/**
 * Localize Room Condition
 */
export const localizeRoomCondition = (t: TFunction, condition: string): string => {
  const conditionMap: Record<string, string> = {
    'CLEAN': t('rooms.conditionValues.clean', 'CLEAN'),
    'DIRTY': t('rooms.conditionValues.dirty', 'DIRTY'),
    'OUT_OF_SERVICE': t('rooms.conditionValues.outOfService', 'OUT OF SERVICE'),
  };
  return conditionMap[condition] || condition;
};

/**
 * Localize Room Occupancy
 */
export const localizeRoomOccupancy = (t: TFunction, occupancy: string): string => {
  const occupancyMap: Record<string, string> = {
    'FREE': t('rooms.occupancyValues.free', 'FREE'),
    'RESERVED': t('rooms.occupancyValues.reserved', 'RESERVED'),
    'OCCUPIED': t('rooms.occupancyValues.occupied', 'OCCUPIED'),
    'DEPARTING_TODAY': t('rooms.occupancyValues.departingToday', 'DEPARTING TODAY'),
  };
  return occupancyMap[occupancy] || occupancy;
};

/**
 * Localize Booking Status
 */
export const localizeBookingStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': t('bookings.status.draft', 'Draft'),
    'CONFIRMED': t('bookings.status.confirmed', 'Confirmed'),
    'CHECKED_IN': t('bookings.status.checkedIn', 'Checked In'),
    'CHECKED_OUT': t('bookings.status.checkedOut', 'Checked Out'),
    'CANCELLED': t('bookings.status.cancelled', 'Cancelled'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Invoice Status
 */
export const localizeInvoiceStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': t('billing.status.draft', 'Draft'),
    'SENT': t('billing.status.sent', 'Sent'),
    'PAID': t('billing.status.paid', 'Paid'),
    'VOID': t('billing.status.void', 'Void'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Export Status
 */
export const localizeExportStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'PENDING': t('billing.export.pending', 'Pending'),
    'SENT': t('billing.export.sent', 'Sent'),
    'FAILED': t('billing.export.failed', 'Failed'),
    'CONFIRMED': t('billing.export.confirmed', 'Confirmed'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Meal Order Status
 */
export const localizeMealOrderStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'PLANNED': t('kitchen.orders.status.planned', 'Planned'),
    'IN_PREP': t('kitchen.orders.status.inPrep', 'In Prep'),
    'READY': t('kitchen.orders.status.ready', 'Ready'),
    'DELIVERED': t('kitchen.orders.status.delivered', 'Delivered'),
    'CANCELLED': t('kitchen.orders.status.cancelled', 'Cancelled'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Housekeeping Task Status
 */
export const localizeHousekeepingStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'PENDING': t('housekeeping.status.pending', 'Pending'),
    'IN_PROGRESS': t('housekeeping.status.inProgress', 'In Progress'),
    'DONE': t('housekeeping.status.done', 'Done'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Maintenance Ticket Status
 */
export const localizeMaintenanceStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'OPEN': t('maintenance.status.open', 'Open'),
    'TRIAGED': t('maintenance.status.triaged', 'Triaged'),
    'IN_PROGRESS': t('maintenance.status.inProgress', 'In Progress'),
    'RESOLVED': t('maintenance.status.resolved', 'Resolved'),
    'CLOSED': t('maintenance.status.closed', 'Closed'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Room Type
 */
export const localizeRoomType = (t: TFunction, type: string): string => {
  const typeMap: Record<string, string> = {
    'SINGLE': t('rooms.typeValues.single', 'Single'),
    'DOUBLE': t('rooms.typeValues.double', 'Double'),
    'APARTMENT': t('rooms.typeValues.apartment', 'Apartment'),
  };
  return typeMap[type] || type;
};

/**
 * Localize Payment Method
 */
export const localizePaymentMethod = (t: TFunction, method: string): string => {
  const methodMap: Record<string, string> = {
    'PREPAYMENT': t('bookings.payment.prepayment', 'Prepayment'),
    'INVOICE': t('bookings.payment.invoice', 'Pay by Invoice'),
    'PAYMENT_LINK': t('bookings.payment.link', 'Payment Link'),
    'NETS_TERMINAL': t('bookings.payment.nets', 'NETS Terminal'),
  };
  return methodMap[method] || method;
};

/**
 * Localize Customer Type
 */
export const localizeCustomerType = (t: TFunction, type: string): string => {
  const typeMap: Record<string, string> = {
    'PERSON': t('bookings.customerType.person', 'Person'),
    'COMPANY': t('bookings.customerType.company', 'Company'),
  };
  return typeMap[type] || type;
};

/**
 * Localize VAT Code
 */
export const localizeVatCode = (t: TFunction, code: number): string => {
  const codeMap: Record<number, string> = {
    15: t('common.vat.15', '15%'),
    25: t('common.vat.25', '25%'),
  };
  return codeMap[code] || `${code}%`;
};

/**
 * Localize Maintenance Priority
 */
export const localizeMaintenancePriority = (t: TFunction, priority: string): string => {
  const priorityMap: Record<string, string> = {
    'LOW': t('maintenance.priority.low', 'Low'),
    'MEDIUM': t('maintenance.priority.medium', 'Medium'),
    'HIGH': t('maintenance.priority.high', 'High'),
    'CRITICAL': t('maintenance.priority.critical', 'Critical'),
  };
  return priorityMap[priority] || priority;
};

/**
 * Localize Audit Action
 */
export const localizeAuditAction = (t: TFunction, action: string): string => {
  // Convert snake_case to readable format
  const readable = action.replace(/_/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Try to find translation, fallback to readable format
  const key = `audit.action.${action.toLowerCase()}`;
  const translated = t(key, readable);
  return translated !== key ? translated : readable;
};

/**
 * Localize Audit Entity Type
 */
export const localizeAuditEntityType = (t: TFunction, entityType: string): string => {
  const typeMap: Record<string, string> = {
    'ROOM': t('audit.entity.room', 'Room'),
    'BOOKING': t('audit.entity.booking', 'Booking'),
    'INVOICE': t('audit.entity.invoice', 'Invoice'),
    'PAYMENT': t('audit.entity.payment', 'Payment'),
    'KITCHEN_ITEM': t('audit.entity.kitchenItem', 'Kitchen Item'),
    'MEAL_ORDER': t('audit.entity.mealOrder', 'Meal Order'),
    'HOUSEKEEPING_TASK': t('audit.entity.housekeepingTask', 'Housekeeping Task'),
    'MAINTENANCE_TICKET': t('audit.entity.maintenanceTicket', 'Maintenance Ticket'),
  };
  return typeMap[entityType] || entityType.replace(/_/g, ' ');
};

