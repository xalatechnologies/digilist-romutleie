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
    'DEPARTING': t('rooms.occupancyValues.departingToday', 'DEPARTING TODAY'),
    'DEPARTING_TODAY': t('rooms.occupancyValues.departingToday', 'DEPARTING TODAY'),
  };
  return occupancyMap[occupancy] || occupancy;
};

/**
 * Localize Booking Status
 */
export const localizeBookingStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': t('bookings.statusValues.draft', 'Draft'),
    'CONFIRMED': t('bookings.statusValues.confirmed', 'Confirmed'),
    'CHECKED_IN': t('bookings.statusValues.checkedIn', 'Checked In'),
    'CHECKED_OUT': t('bookings.statusValues.checkedOut', 'Checked Out'),
    'CANCELLED': t('bookings.statusValues.cancelled', 'Cancelled'),
  };
  return statusMap[status] || status;
};

/**
 * Localize Invoice Status
 */
export const localizeInvoiceStatus = (t: TFunction, status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': t('billing.statusValues.draft', 'Draft'),
    'SENT': t('billing.statusValues.sent', 'Sent'),
    'PAID': t('billing.statusValues.paid', 'Paid'),
    'VOID': t('billing.statusValues.void', 'Void'),
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
  // Handle both enum keys and enum values
  const methodMap: Record<string, string> = {
    // Enum keys
    'PREPAYMENT': t('bookings.payment.prepayment', 'Prepayment'),
    'INVOICE': t('bookings.payment.invoice', 'Pay by Invoice'),
    'PAYMENT_LINK': t('bookings.payment.link', 'Payment Link'),
    'NETS_TERMINAL': t('bookings.payment.nets', 'NETS Terminal'),
    'NETS': t('bookings.payment.nets', 'NETS Terminal'),
    // Enum values (actual string values from PaymentMethod enum)
    'Prepayment': t('bookings.payment.prepayment', 'Prepayment'),
    'Pay by Invoice': t('bookings.payment.invoice', 'Pay by Invoice'),
    'Payment Link': t('bookings.payment.link', 'Payment Link'),
    'NETS Terminal': t('bookings.payment.nets', 'NETS Terminal'),
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
 * Localize Maintenance Priority/Severity (they use the same values)
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
 * Localize Maintenance Severity (same as priority)
 */
export const localizeMaintenanceSeverity = (t: TFunction, severity: string): string => {
  return localizeMaintenancePriority(t, severity);
};

/**
 * Localize Maintenance Category
 */
export const localizeMaintenanceCategory = (t: TFunction, category: string): string => {
  const categoryMap: Record<string, string> = {
    'PLUMBING': t('maintenance.categoryValues.plumbing', 'Plumbing'),
    'ELECTRICAL': t('maintenance.categoryValues.electrical', 'Electrical'),
    'HVAC': t('maintenance.categoryValues.hvac', 'HVAC'),
    'CLEANING_DEEP': t('maintenance.categoryValues.deepCleaning', 'Deep Cleaning'),
    'DAMAGE': t('maintenance.categoryValues.damage', 'Damage'),
    'SAFETY_ISSUE': t('maintenance.categoryValues.safetyIssue', 'Safety Issue'),
    'SAFETY': t('maintenance.categoryValues.safetyIssue', 'Safety Issue'),
    'OTHER': t('maintenance.categoryValues.other', 'Other'),
  };
  return categoryMap[category] || category.replace(/_/g, ' ');
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

/**
 * Localize Kitchen Item Name
 * Maps item IDs to translation keys for mock data items
 */
export const localizeKitchenItemName = (t: TFunction, itemId: string, fallbackName: string): string => {
  const nameMap: Record<string, string> = {
    'k1': t('kitchen.items.mock.breakfastBuffet.name', 'Breakfast Buffet'),
    'k2': t('kitchen.items.mock.packedLunch.name', 'Packed Lunch'),
    'k3': t('kitchen.items.mock.threeCourseDinner.name', '3-Course Dinner'),
    'k4': t('kitchen.items.mock.coffeeSnack.name', 'Coffee & Snack'),
    'k5': t('kitchen.items.mock.roomServiceBreakfast.name', 'Room Service Breakfast'),
    'k6': t('kitchen.items.mock.businessLunch.name', 'Business Lunch'),
    'k7': t('kitchen.items.mock.vegetarianOption.name', 'Vegetarian Option'),
    'k8': t('kitchen.items.mock.wineSelection.name', 'Wine Selection'),
    'k9': t('kitchen.items.mock.minibarRefill.name', 'Minibar Refill'),
    'k10': t('kitchen.items.mock.afternoonTea.name', 'Afternoon Tea'),
    'k11': t('kitchen.items.mock.lateNightSnack.name', 'Late Night Snack'),
  };
  return nameMap[itemId] || fallbackName;
};

/**
 * Localize Kitchen Item Description
 * Maps item IDs to translation keys for mock data descriptions
 */
export const localizeKitchenItemDescription = (t: TFunction, itemId: string, fallbackDescription: string): string => {
  const descMap: Record<string, string> = {
    'k1': t('kitchen.items.mock.breakfastBuffet.description', 'Continental breakfast buffet with hot and cold items'),
    'k2': t('kitchen.items.mock.packedLunch.description', 'Takeaway lunch box'),
    'k3': t('kitchen.items.mock.threeCourseDinner.description', 'Full three-course dinner service'),
    'k4': t('kitchen.items.mock.coffeeSnack.description', 'Coffee break with pastries'),
    'k5': t('kitchen.items.mock.roomServiceBreakfast.description', 'Full breakfast served in room'),
    'k6': t('kitchen.items.mock.businessLunch.description', 'Three-course business lunch'),
    'k7': t('kitchen.items.mock.vegetarianOption.description', 'Vegetarian meal option'),
    'k8': t('kitchen.items.mock.wineSelection.description', 'Premium wine selection'),
    'k9': t('kitchen.items.mock.minibarRefill.description', 'Standard minibar refill'),
    'k10': t('kitchen.items.mock.afternoonTea.description', 'Traditional afternoon tea service'),
    'k11': t('kitchen.items.mock.lateNightSnack.description', 'Light snack for late arrivals'),
  };
  return descMap[itemId] || fallbackDescription;
};

/**
 * Localize Maintenance Ticket Title
 * Maps ticket IDs to translation keys for mock data titles
 */
export const localizeMaintenanceTicketTitle = (t: TFunction, ticketId: string, fallbackTitle: string): string => {
  const titleMap: Record<string, string> = {
    't1': t('maintenance.tickets.t1.title', 'Leaking Faucet'),
    't2': t('maintenance.tickets.t2.title', 'Electrical Issue'),
    't3': t('maintenance.tickets.t3.title', 'HVAC Noise'),
    't4': t('maintenance.tickets.t4.title', 'Window Damage'),
  };
  return titleMap[ticketId] || fallbackTitle;
};

/**
 * Localize Maintenance Ticket Description
 * Maps ticket IDs to translation keys for mock data descriptions
 */
export const localizeMaintenanceTicketDescription = (t: TFunction, ticketId: string, fallbackDescription: string): string => {
  const descMap: Record<string, string> = {
    't1': t('maintenance.tickets.t1.description', 'Leaking faucet in bathroom, water damage to floor'),
    't2': t('maintenance.tickets.t2.description', 'Light switch not working properly in bedroom'),
    't3': t('maintenance.tickets.t3.description', 'AC unit making unusual noise'),
    't4': t('maintenance.tickets.t4.description', 'Window frame damaged, safety concern'),
  };
  return descMap[ticketId] || fallbackDescription;
};

/**
 * Localize Block Reason
 * Maps BlockReason enum values to translation keys
 */
export const localizeBlockReason = (t: TFunction, reason: string): string => {
  const reasonMap: Record<string, string> = {
    'Maintenance': t('rooms.blockReason.maintenance', 'Maintenance'),
    'Damage': t('rooms.blockReason.damage', 'Damage'),
    'Safety issue': t('rooms.blockReason.safetyIssue', 'Safety issue'),
    'Deep cleaning': t('rooms.blockReason.deepCleaning', 'Deep cleaning'),
    'Administrative block': t('rooms.blockReason.administrativeBlock', 'Administrative block'),
  };
  return reasonMap[reason] || reason;
};

