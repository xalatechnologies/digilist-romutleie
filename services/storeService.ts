import { 
  IRoom, IBooking, RoomStatus, RoomType, BookingStatus, 
  IMealOrder, IMaintenanceTicket, IInvoice, IHousekeepingTask, 
  IKitchenItem, IDailySummary, IAuditLog, MaintenancePriority, IPayment,
  CustomerType, PaymentMethod, IRoomSummary, RoomOccupancy,
  MealOrderStatus, VatCode, MaintenanceCategory, MaintenanceSeverity,
  MaintenanceTicketStatus, ITicketAttachment, BlockReason,
  InvoiceStatus, InvoiceLineSourceType, IInvoiceLine, PaymentMethodEnum,
  PaymentStatus, IAccountingExport, AccountingExportStatus,
  AuditEntityType, AuditAction
} from '../types';
import { integrations } from './integrationService';
import { getRequestContext } from '../contexts/RequestContext';
import { auditService } from './auditService';
import { availabilityService } from './availabilityService';

const INITIAL_ROOMS: IRoom[] = [
  { id: '1', number: '101', type: RoomType.SINGLE, capacity: 1, floor: 1, pricePerNight: 950, status: RoomStatus.CLEAN },
  { id: '2', number: '102', type: RoomType.SINGLE, capacity: 1, floor: 1, pricePerNight: 950, status: RoomStatus.CLEAN },
  { id: '3', number: '201', type: RoomType.DOUBLE, capacity: 2, floor: 2, pricePerNight: 1450, status: RoomStatus.DIRTY },
  { id: '4', number: '301', type: RoomType.APARTMENT, capacity: 4, floor: 3, pricePerNight: 2800, status: RoomStatus.OUT_OF_SERVICE, outOfServiceReason: 'Plumbing issue' },
  { id: '5', number: '302', type: RoomType.APARTMENT, capacity: 4, floor: 3, pricePerNight: 2800, status: RoomStatus.CLEAN },
  { id: '6', number: '103', type: RoomType.SINGLE, capacity: 1, floor: 1, pricePerNight: 950, status: RoomStatus.CLEAN },
];

const INITIAL_BOOKINGS: IBooking[] = [
  { 
    id: 'b1', 
    customerType: CustomerType.COMPANY,
    customerName: 'NASA Operations', 
    companyName: 'NASA',
    customerEmail: 'admin@nasa.gov', 
    customerPhone: '+1-555-NASA',
    billingAddress: 'Houston, TX',
    orgNumber: '123-456',
    guestCount: 2, 
    roomId: '3', 
    startDate: '2025-05-10', 
    endDate: '2025-05-15', 
    status: BookingStatus.CONFIRMED, 
    totalPrice: 7250, 
    reference1: 'PROJ-X', 
    reference2: 'DEPT-4',
    bookingMode: 'Group',
    paymentMethod: PaymentMethod.INVOICE,
    cardGuaranteeRequired: false,
    extraFees: []
  }
];

const INITIAL_KITCHEN_ITEMS: IKitchenItem[] = [
  { 
    id: 'k1', 
    name: 'Breakfast Buffet', 
    description: 'Continental breakfast buffet with hot and cold items',
    unitPrice: 150, 
    vatCode: VatCode.VAT_15, 
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'k2', 
    name: 'Packed Lunch', 
    description: 'Takeaway lunch box',
    unitPrice: 120, 
    vatCode: VatCode.VAT_15, 
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'k3', 
    name: '3-Course Dinner', 
    description: 'Full three-course dinner service',
    unitPrice: 450, 
    vatCode: VatCode.VAT_15, 
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'k4', 
    name: 'Coffee & Snack', 
    description: 'Coffee break with pastries',
    unitPrice: 75, 
    vatCode: VatCode.VAT_15, 
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

class StoreService {
  private rooms: IRoom[] = [...INITIAL_ROOMS];
  private bookings: IBooking[] = [...INITIAL_BOOKINGS];
  private kitchenItems: IKitchenItem[] = [...INITIAL_KITCHEN_ITEMS];
  private meals: IMealOrder[] = [];
  private housekeepingTasks: IHousekeepingTask[] = [];
  private tickets: IMaintenanceTicket[] = [];
  private ticketAttachments: ITicketAttachment[] = [];
  private invoices: IInvoice[] = [];
  private invoiceLines: IInvoiceLine[] = [];
  private payments: IPayment[] = [];
  private accountingExports: IAccountingExport[] = [];
  private auditSummaries: IDailySummary[] = [];
  private auditLogs: IAuditLog[] = [];

  constructor() {
    this.rooms.forEach(room => {
      if (room.status === RoomStatus.DIRTY) {
        this.addHousekeepingTask({
          roomId: room.id,
          type: 'Turnover',
          status: 'Pending',
          dueDate: new Date().toISOString().split('T')[0]
        });
      }
    });
    this.logAudit({
      actorUserId: null,
      actorRoles: ['SYSTEM'],
      action: AuditAction.SYSTEM_INIT,
      entityType: AuditEntityType.SYSTEM,
      entityId: null,
      message: 'System store initialized with enhanced availability logic'
    });
  }

  // Unified Audit Logging - Single source of truth
  // Delegates to AuditService for centralized logging
  private logAudit(params: {
    actorUserId: string | null;
    actorRoles: string[];
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string | null;
    message: string;
    before?: any;
    after?: any;
    metadata?: any;
  }) {
    // Use AuditService for centralized logging
    const log = auditService.log({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      message: params.message,
      before: params.before,
      after: params.after,
      metadata: params.metadata,
      actorUserId: params.actorUserId,
      actorRoles: params.actorRoles
    });

    // Also maintain in local array for backward compatibility
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 5000) this.auditLogs.pop();
  }
  
  // Helper to map entity type to legacy domain
  private mapEntityTypeToDomain(entityType: AuditEntityType): IAuditLog['domain'] {
    switch (entityType) {
      case AuditEntityType.ROOM:
      case AuditEntityType.HOUSEKEEPING_TASK:
        return 'ROOM';
      case AuditEntityType.RESERVATION:
      case AuditEntityType.BOOKING_GROUP:
        return 'BOOKING';
      case AuditEntityType.MEAL_ORDER:
      case AuditEntityType.KITCHEN_ITEM:
        return 'KITCHEN';
      case AuditEntityType.INVOICE:
      case AuditEntityType.INVOICE_LINE:
      case AuditEntityType.PAYMENT:
        return 'BILLING';
      default:
        return 'SYSTEM';
    }
  }
  
  // Helper to derive roles from userId (simplified - in real system would query user service)
  private getUserRoles(userId: string): string[] {
    // In a real system, this would query a user service
    // For now, use userId as role identifier
    if (userId === 'SYSTEM' || userId === 'Admin' || userId === 'Auto-System') {
      return ['SYSTEM'];
    }
    // Default to the userId as role (simplified)
    return [userId];
  }
  
  // Legacy method for backward compatibility (maps to new system)
  private logAction(domain: IAuditLog['domain'], userId: string, action: string, details: string) {
    const entityType = this.mapDomainToEntityType(domain);
    this.logAudit({
      actorUserId: userId === 'SYSTEM' || userId === 'Auto-System' ? null : userId,
      actorRoles: this.getUserRoles(userId),
      action: action as AuditAction,
      entityType,
      entityId: null,
      message: details
    });
  }
  
  private mapDomainToEntityType(domain: IAuditLog['domain']): AuditEntityType {
    switch (domain) {
      case 'ROOM': return AuditEntityType.ROOM;
      case 'BOOKING': return AuditEntityType.RESERVATION;
      case 'KITCHEN': return AuditEntityType.MEAL_ORDER;
      case 'BILLING': return AuditEntityType.INVOICE;
      case 'PAYMENT': return AuditEntityType.PAYMENT;
      default: return AuditEntityType.SYSTEM;
    }
  }
  
  // Get audit logs with filters - fetches from backend API with fallback
  async getAuditLogs(filters?: {
    entityType?: AuditEntityType;
    entityId?: string;
    action?: AuditAction;
    actorUserId?: string;
    from?: Date;
    to?: Date;
    q?: string; // Search in message
    limit?: number;
  }): Promise<IAuditLog[]> {
    // Try to fetch from backend first
    try {
      const { fetchAuditLogs } = await import('./auditApiService');
      const response = await fetchAuditLogs({
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        actorUserId: filters?.actorUserId,
        action: filters?.action,
        from: filters?.from?.toISOString(),
        to: filters?.to?.toISOString(),
        q: filters?.q,
        limit: filters?.limit || 50,
      });
      return response.logs;
    } catch (error) {
      // Fallback to local audit service if backend unavailable
      console.warn('Backend audit unavailable, using local logs:', error);
      let logs = auditService.getLogs({
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        action: filters?.action,
        actorUserId: filters?.actorUserId,
        from: filters?.from,
        to: filters?.to,
        limit: filters?.limit || 500
      });
      
      // Apply text search filter if provided
      if (filters?.q) {
        const query = filters.q.toLowerCase();
        logs = logs.filter(l =>
          l.message.toLowerCase().includes(query) ||
          l.entityId?.toLowerCase().includes(query) ||
          l.actorUserId?.toLowerCase().includes(query)
        );
      }
      
      return logs;
    }
  }
  
  getLogs() { 
    // Legacy method - return all logs from AuditService
    const allLogs = auditService.getAllLogs();
    return allLogs.map(log => ({
      ...log,
      timestamp: log.timestamp || log.createdAt,
      userId: log.userId || log.actorUserId || 'SYSTEM',
      domain: log.domain || this.mapEntityTypeToDomain(log.entityType),
      details: log.details || log.message
    }));
  }

  getRooms() { return this.rooms; }
  getRoomById(id: string) { return this.rooms.find(r => r.id === id); }
  
  async updateRoomStatus(id: string, status: RoomStatus, userId?: string, reason?: string, note?: string, returnDate?: string, ticketId?: string) {
    // Get userId from request context if not provided
    const requestCtx = getRequestContext();
    const effectiveUserId = userId || requestCtx.userId;
    
    const room = this.rooms.find(r => r.id === id);
    if (!room) {
      throw new Error('Room not found');
    }

      const oldStatus = room.status;

    // Call backend API first (backend writes audit log)
    try {
      const { apiClient } = await import('../utils/apiClient');
      await apiClient.patch(`/rooms/${id}/status`, {
        status,
        reason: reason || undefined,
        note: note || undefined,
      });
    } catch (error: any) {
      // If backend is unavailable, fall back to local update
      console.warn('Backend API unavailable, using local update:', error);
      // Continue with local update for graceful degradation
    }

    // Update local state
      room.status = status;
      
      if (status === RoomStatus.OUT_OF_SERVICE) {
        if (reason) room.outOfServiceReason = reason;
        if (note) room.outOfServiceNote = note;
        if (returnDate) room.expectedReturnDate = returnDate;
        if (ticketId) room.linkedTicketId = ticketId;
      } else {
        delete room.outOfServiceReason;
        delete room.outOfServiceNote;
        delete room.expectedReturnDate;
        delete room.linkedTicketId;
      }

    // Only log locally if backend call failed (graceful degradation)
    // In production, remove this and rely solely on backend audit
    try {
      const { apiClient } = await import('../utils/apiClient');
      // If we get here, backend call succeeded, so skip local audit
    } catch {
      // Backend unavailable, use local audit as fallback
      const logMessage = status === RoomStatus.OUT_OF_SERVICE
        ? `Unit set out of service (${reason || 'No reason'})`
        : oldStatus === RoomStatus.OUT_OF_SERVICE && status !== RoomStatus.OUT_OF_SERVICE
        ? `Unit restored to service (condition set to ${status})`
        : `Housekeeping status changed: ${oldStatus} -> ${status}`;

      const action = status === RoomStatus.OUT_OF_SERVICE 
        ? AuditAction.ROOM_SET_OUT_OF_SERVICE
        : oldStatus === RoomStatus.OUT_OF_SERVICE && status !== RoomStatus.OUT_OF_SERVICE
        ? AuditAction.ROOM_RESTORED_FROM_SERVICE
        : AuditAction.ROOM_CONDITION_CHANGED;

      auditService.logChange({
        entityType: AuditEntityType.ROOM,
        entityId: id,
        action,
        before: { status: oldStatus, reason: room.outOfServiceReason, note: room.outOfServiceNote },
        after: { status, reason: reason || room.outOfServiceReason, note: note || room.outOfServiceNote },
        message: logMessage,
      });
    }
    
    return [...this.rooms];
  }

  getFutureBookingCount(roomId: string): number {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.bookings.filter(b => 
      b.roomId === roomId && 
      b.status !== BookingStatus.CANCELLED && 
      b.status !== BookingStatus.CHECKED_OUT &&
      new Date(b.startDate) >= today
    ).length;
  }

  // Delegate to AvailabilityService for centralized availability logic
  isRoomAvailable(roomId: string, startDate: string, endDate: string, excludeBookingId?: string): boolean {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return false;
    
    return availabilityService.isBookable(
      roomId,
      startDate,
      endDate,
      room,
      this.bookings,
      excludeBookingId
    );
  }

  // Check for overlaps (delegates to AvailabilityService)
  checkOverlap(roomId: string, startDate: string, endDate: string, excludeBookingId?: string): boolean {
    return availabilityService.checkOverlap(
      roomId,
      startDate,
      endDate,
      this.bookings,
      excludeBookingId
    );
  }

  // Get room occupancy state (delegates to AvailabilityService)
  getRoomOccupancyState(roomId: string, date: Date | string = new Date()): {
    state: RoomOccupancy;
    currentBooking?: IBooking;
    nextBooking?: IBooking;
    conflictingBookings?: IBooking[];
  } {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) {
      return { state: RoomOccupancy.FREE };
    }

    return availabilityService.getRoomOccupancyState(
      roomId,
      date,
      room,
      this.bookings
    );
  }

  // Get available rooms for date range
  getAvailableRooms(startDate: string, endDate: string): IRoom[] {
    return availabilityService.getAvailableRooms(
      startDate,
      endDate,
      this.rooms,
      this.bookings
    );
  }

  // Helper to simulate backend summary logic
  getRoomSummaries(date: string = new Date().toISOString().split('T')[0]): IRoomSummary[] {
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    return this.rooms.map(room => {
      // Determine Occupancy
      let occupancy = RoomOccupancy.FREE;
      let nextEvent = 'No upcoming events';
      let currentBooking: IBooking | undefined;

      // Find relevant bookings
      const activeBooking = this.bookings.find(b => {
        if (b.roomId !== room.id) return false;
        if (b.status === BookingStatus.CANCELLED) return false;
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        // If booking covers today
        return targetDate >= start && targetDate < end;
      });

      const nextBooking = this.bookings
        .filter(b => b.roomId === room.id && b.status !== BookingStatus.CANCELLED && new Date(b.startDate) > targetDate)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

      if (activeBooking) {
        currentBooking = activeBooking;
        const end = new Date(activeBooking.endDate);
        const isCheckoutToday = end.toDateString() === targetDate.toDateString();

        if (activeBooking.status === BookingStatus.CHECKED_IN) {
          occupancy = isCheckoutToday ? RoomOccupancy.DEPARTING : RoomOccupancy.OCCUPIED;
          nextEvent = isCheckoutToday ? 'Checkout today 11:00' : `Occupied until ${activeBooking.endDate}`;
        } else if (activeBooking.status === BookingStatus.CONFIRMED) {
          // If reserved for today but not checked in yet
           const start = new Date(activeBooking.startDate);
           const isArrivalToday = start.toDateString() === targetDate.toDateString();
           occupancy = RoomOccupancy.RESERVED;
           nextEvent = isArrivalToday ? 'Arrival today 15:00' : `Reserved from ${activeBooking.startDate}`;
        }
      } else {
        // No active booking
        if (nextBooking) {
          nextEvent = `Next arrival: ${nextBooking.startDate}`;
        } else {
          nextEvent = 'Available for 7+ days';
        }

        // Override if OOS
        if (room.status === RoomStatus.OUT_OF_SERVICE) {
           nextEvent = `Blocked: ${room.outOfServiceReason || 'Maintenance'}`;
        }
      }

      const hasHousekeeping = this.housekeepingTasks.some(t => t.roomId === room.id && t.status !== 'Completed');
      const hasMaintenance = this.tickets.some(t => t.roomId === room.id && t.status !== 'Resolved');

      return {
        ...room,
        occupancy,
        nextEvent,
        hasHousekeeping,
        hasMaintenance,
        currentBooking
      };
    });
  }

  // Booking Logic
  getBookings() { return this.bookings; }
  
  addBooking(booking: Omit<IBooking, 'id' | 'totalPrice' | 'status'>, mealOrders: Omit<IMealOrder, 'id' | 'bookingId' | 'status'>[] = [], userId: string = 'Staff') {
    const room = this.rooms.find(r => r.id === booking.roomId);
    if (!room) throw new Error("Room not found");
    
    if (!this.isRoomAvailable(booking.roomId, booking.startDate, booking.endDate)) {
      throw new Error(`Room ${room.number} is unavailable.`);
    }

    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    const basePrice = booking.pricePerNightOverride || room.pricePerNight;
    let roomTotal = nights * basePrice;
    if (booking.discountPercentage) {
      roomTotal = roomTotal * (1 - booking.discountPercentage / 100);
    }

    const extraFeesTotal = (booking.extraFees || []).reduce((sum, f) => sum + f.amount, 0);

    const bookingId = Math.random().toString(36).substr(2, 9);
    
    // Process meal orders - convert old format to new format
    mealOrders.forEach(m => {
      const now = new Date();
      const newOrder: IMealOrder = {
        id: Math.random().toString(36).substr(2, 9),
        orderDateTime: m.date || booking.startDate,
        quantity: m.qty,
        kitchenItemId: m.itemId,
        servingLocation: m.servingLocation || 'Dining Room',
        referenceText: booking.groupName || booking.customerName,
        notes: m.notes,
        status: MealOrderStatus.PLANNED,
        reservationId: bookingId,
        bookingGroupId: booking.groupName,
        customerId: booking.customerEmail,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now
      };
      this.meals.push(newOrder);
      this.logAction('KITCHEN', userId, 'ORDER_CREATE', `Meal order created from booking: ${m.type} x${m.qty}`);
    });

    const newBooking: IBooking = { 
      ...booking, 
      id: bookingId,
      totalPrice: roomTotal + extraFeesTotal,
      status: BookingStatus.CONFIRMED 
    };
    
    this.bookings.push(newBooking);
    this.logAction('BOOKING', userId, 'CREATE', `Reservation for ${booking.customerName}`);
    return newBooking;
  }

  updateBookingStatus(id: string, status: BookingStatus, userId: string = 'Staff') {
    const booking = this.bookings.find(b => b.id === id);
    if (booking) {
      const oldStatus = booking.status;
      booking.status = status;
      
      let action = AuditAction.RESERVATION_STATUS_CHANGED;
      if (status === BookingStatus.CHECKED_IN) action = AuditAction.CHECK_IN;
      if (status === BookingStatus.CHECKED_OUT) action = AuditAction.CHECK_OUT;
      if (status === BookingStatus.CANCELLED) action = AuditAction.RESERVATION_CANCELLED;
      
      this.logAudit({
        actorUserId: userId,
        actorRoles: this.getUserRoles(userId),
        action,
        entityType: AuditEntityType.RESERVATION,
        entityId: id,
        message: `Reservation ${action === AuditAction.CHECK_IN ? 'checked in' : action === AuditAction.CHECK_OUT ? 'checked out' : action === AuditAction.RESERVATION_CANCELLED ? 'cancelled' : 'status changed'}: ${oldStatus} → ${status}`,
        before: { status: oldStatus },
        after: { status }
      });
      if (status === BookingStatus.CHECKED_OUT) {
        this.updateRoomStatus(booking.roomId, RoomStatus.DIRTY, 'Auto-System');
        this.addHousekeepingTask({
          roomId: booking.roomId,
          type: 'Turnover',
          status: 'Pending',
          dueDate: new Date().toISOString().split('T')[0]
        });
      }
    }
    return [...this.bookings];
  }

  // Kitchen Items
  getKitchenItems(activeOnly: boolean = false) { 
    return activeOnly ? this.kitchenItems.filter(i => i.isActive) : this.kitchenItems;
  }
  
  getKitchenItemById(id: string) {
    return this.kitchenItems.find(i => i.id === id);
  }
  
  addKitchenItem(item: Omit<IKitchenItem, 'id' | 'createdAt' | 'updatedAt'>, userId: string = 'Staff') {
    const now = new Date();
    const newItem: IKitchenItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: now,
      updatedAt: now
    };
    this.kitchenItems.push(newItem);
    this.logAction('KITCHEN', userId, 'ITEM_CREATE', `Kitchen item created: ${item.name}`);
    return newItem;
  }
  
  updateKitchenItem(id: string, updates: Partial<Omit<IKitchenItem, 'id' | 'createdAt'>>, userId: string = 'Staff') {
    const item = this.kitchenItems.find(i => i.id === id);
    if (!item) throw new Error('Kitchen item not found');
    
    const oldName = item.name;
    const beforeState = {
      name: item.name,
      unitPrice: item.unitPrice,
      vatCode: item.vatCode,
      isActive: item.isActive
    };
    
    Object.assign(item, updates, { updatedAt: new Date() });
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: updates.isActive === false ? AuditAction.KITCHEN_ITEM_DEACTIVATED : AuditAction.KITCHEN_ITEM_UPDATED,
      entityType: AuditEntityType.KITCHEN_ITEM,
      entityId: id,
      message: updates.isActive === false ? `Kitchen item deactivated: ${oldName}` : `Kitchen item updated: ${oldName}`,
      before: beforeState,
      after: { name: item.name, unitPrice: item.unitPrice, vatCode: item.vatCode, isActive: item.isActive }
    });
    return item;
  }

  // Meal Orders
  getMeals() { return this.meals; }
  
  getMealOrders(filters?: { from?: string; to?: string; status?: MealOrderStatus; q?: string }) {
    let filtered = [...this.meals];
    
    if (filters?.from) {
      const fromDate = new Date(filters.from);
      filtered = filtered.filter(m => new Date(m.orderDateTime) >= fromDate);
    }
    
    if (filters?.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => new Date(m.orderDateTime) <= toDate);
    }
    
    if (filters?.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(m => 
        m.referenceText?.toLowerCase().includes(query) ||
        m.notes?.toLowerCase().includes(query) ||
        m.servingLocation.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => new Date(a.orderDateTime).getTime() - new Date(b.orderDateTime).getTime());
  }
  
  getKitchenBoard(filters?: { from?: string; to?: string }) {
    const from = filters?.from || new Date().toISOString().split('T')[0];
    const to = filters?.to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const orders = this.getMealOrders({ from, to, status: undefined });
    
    // Return summary optimized for board view
    return orders
      .filter(o => o.status !== MealOrderStatus.CANCELLED && o.status !== MealOrderStatus.DELIVERED)
      .map(order => {
        const item = this.kitchenItems.find(i => i.id === order.kitchenItemId);
        const booking = order.reservationId ? this.bookings.find(b => b.id === order.reservationId) : null;
        
        return {
          id: order.id,
          orderDateTime: order.orderDateTime,
          itemName: item?.name || 'Unknown Item',
          quantity: order.quantity,
          servingLocation: order.servingLocation,
          reference: order.referenceText || booking?.groupName || booking?.customerName || 'Manual Order',
          notes: order.notes,
          status: order.status,
          kitchenItemId: order.kitchenItemId
        };
      });
  }
  
  addMealOrder(order: Omit<IMealOrder, 'id' | 'createdAt' | 'updatedAt'>, userId: string = 'Staff') {
    // Validation
    if (!order.kitchenItemId || !order.orderDateTime || !order.servingLocation || order.quantity < 1) {
      throw new Error('Invalid meal order: missing required fields');
    }
    
    if (!order.bookingGroupId && !order.reservationId && !order.customerId) {
      throw new Error('Meal order must be linked to booking group, reservation, or customer');
    }
    
    const item = this.kitchenItems.find(i => i.id === order.kitchenItemId);
    if (!item || !item.isActive) {
      throw new Error('Kitchen item not found or inactive');
    }
    
    const now = new Date();
    const newOrder: IMealOrder = {
      ...order,
      id: Math.random().toString(36).substr(2, 9),
      status: order.status || MealOrderStatus.PLANNED,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now
    };
    
    this.meals.push(newOrder);
    this.logAction('KITCHEN', userId, 'ORDER_CREATE', `Meal order created: ${item.name} x${order.quantity} for ${order.servingLocation}`);
    return newOrder;
  }
  
  updateMealOrderStatus(id: string, newStatus: MealOrderStatus, userId: string = 'Staff') {
    const order = this.meals.find(m => m.id === id);
    if (!order) throw new Error('Meal order not found');
    
    const oldStatus = order.status;
    
    // Validate status transition
    const validTransitions: Record<MealOrderStatus, MealOrderStatus[]> = {
      [MealOrderStatus.PLANNED]: [MealOrderStatus.IN_PREP, MealOrderStatus.CANCELLED],
      [MealOrderStatus.IN_PREP]: [MealOrderStatus.READY, MealOrderStatus.CANCELLED],
      [MealOrderStatus.READY]: [MealOrderStatus.DELIVERED],
      [MealOrderStatus.DELIVERED]: [],
      [MealOrderStatus.CANCELLED]: []
    };
    
    if (!validTransitions[oldStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition: ${oldStatus} -> ${newStatus}`);
    }
    
    order.status = newStatus;
    order.updatedAt = new Date();
    
    this.logAction('KITCHEN', userId, 'ORDER_STATUS_CHANGE', `Meal order status changed: ${oldStatus} -> ${newStatus}`);
    return order;
  }
  
  updateMealOrder(id: string, updates: { notes?: string }, userId: string = 'Staff') {
    const order = this.meals.find(m => m.id === id);
    if (!order) throw new Error('Meal order not found');
    
    if (updates.notes !== undefined) order.notes = updates.notes;
    order.updatedAt = new Date();
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.MEAL_ORDER_UPDATED,
      entityType: AuditEntityType.MEAL_ORDER,
      entityId: id,
      message: 'Meal order notes updated',
      before: { notes: order.notes },
      after: { notes: updates.notes }
    });
    return order;
  }
  
  cancelMealOrder(id: string, userId: string = 'Staff') {
    const order = this.meals.find(m => m.id === id);
    if (!order) throw new Error('Meal order not found');
    
    if (order.status === MealOrderStatus.DELIVERED) {
      throw new Error('Cannot cancel a delivered order');
    }
    
    const oldStatus = order.status;
    order.status = MealOrderStatus.CANCELLED;
    order.updatedAt = new Date();
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.MEAL_ORDER_CANCELLED,
      entityType: AuditEntityType.MEAL_ORDER,
      entityId: id,
      message: `Meal order cancelled (was ${oldStatus})`,
      before: { status: oldStatus },
      after: { status: MealOrderStatus.CANCELLED }
    });
    return order;
  }

  // Housekeeping
  getHousekeepingTasks() { return this.housekeepingTasks; }
  addHousekeepingTask(task: Omit<IHousekeepingTask, 'id'>) {
    const newTask = { ...task, id: Math.random().toString(36).substr(2, 9) };
    this.housekeepingTasks.push(newTask);
    return newTask;
  }
  completeTask(taskId: string, userId: string = 'Staff') {
    const task = this.housekeepingTasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'Completed';
      this.updateRoomStatus(task.roomId, RoomStatus.CLEAN, 'Housekeeping');
    }
    return [...this.housekeepingTasks];
  }

  // Housekeeping-specific methods
  updateRoomCondition(roomId: string, condition: RoomStatus.CLEAN | RoomStatus.DIRTY, userId: string = 'Housekeeping', note?: string) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) throw new Error("Room not found");
    
    // Housekeeping can only set CLEAN or DIRTY, never OUT_OF_SERVICE
    if (condition === RoomStatus.OUT_OF_SERVICE) {
      throw new Error("Housekeeping cannot set unit out of service");
    }

    const oldStatus = room.status;
    room.status = condition;
    
    const logMessage = note 
      ? `Housekeeping marked unit ${condition.toLowerCase()} (${note})`
      : `Housekeeping marked unit ${condition.toLowerCase()}`;
    
    this.logAction('ROOM', userId, 'HOUSEKEEPING_STATUS_CHANGE', logMessage);
    return [...this.rooms];
  }

  createMaintenanceTicketFromHousekeeping(
    roomId: string,
    category: string,
    description: string,
    userId: string = 'Housekeeping',
    imageUrl?: string,
    mayRequireBlocking: boolean = false
  ) {
    const priority = mayRequireBlocking ? MaintenancePriority.HIGH : MaintenancePriority.MEDIUM;
    
    const ticket: Omit<IMaintenanceTicket, 'id' | 'createdAt' | 'status'> = {
      roomId,
      description: `[Housekeeping Report] ${category}: ${description}`,
      priority,
      imageUrl
    };

    const newTicket = this.addTicket(ticket, userId);
    
    // Log the housekeeping action
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.HOUSEKEEPING_ISSUE_REPORTED,
      entityType: AuditEntityType.ROOM,
      entityId: roomId,
      message: `Housekeeping reported issue: ${category} - ${description}${mayRequireBlocking ? ' (may require blocking)' : ''}`,
      metadata: { category, mayRequireBlocking, ticketId: newTicket.id }
    });
    
    // Note: We don't auto-block here - maintenance/admin decides
    return newTicket;
  }

  getHousekeepingTaskList() {
    const today = new Date().toISOString().split('T')[0];
    const rooms = this.rooms;
    const bookings = this.bookings;

    return rooms.map(room => {
      // Find next arrival
      const nextBooking = bookings
        .filter(b => 
          b.roomId === room.id && 
          b.status !== BookingStatus.CANCELLED && 
          new Date(b.startDate) >= new Date(today)
        )
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

      // Determine cleaning trigger
      let cleaningTrigger = 'Manual dirty';
      const checkoutToday = bookings.some(b => 
        b.roomId === room.id && 
        b.endDate === today && 
        b.status === BookingStatus.CHECKED_OUT
      );
      if (checkoutToday) {
        cleaningTrigger = 'Checkout today';
      } else if (this.housekeepingTasks.some(t => t.roomId === room.id && t.type === 'Deep Clean' && t.status !== 'Completed')) {
        cleaningTrigger = 'Deep clean';
      }

      // Determine priority
      let priority = 'No upcoming arrival';
      if (nextBooking) {
        const arrivalDate = new Date(nextBooking.startDate);
        const todayDate = new Date(today);
        const daysUntilArrival = Math.floor((arrivalDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilArrival === 0) {
          priority = 'Arrival today';
        } else if (daysUntilArrival === 1) {
          priority = 'Arrival tomorrow';
        }
      }

      return {
        room,
        nextArrival: nextBooking ? {
          date: nextBooking.startDate,
          time: nextBooking.checkInTime || '15:00'
        } : null,
        cleaningTrigger,
        priority
      };
    });
  }

  // Invoices & Payments
  getInvoices(filters?: {
    status?: InvoiceStatus;
    from?: string;
    to?: string;
    q?: string;
    exportStatus?: AccountingExportStatus;
    unpaid?: boolean;
  }) {
    let filtered = [...this.invoices];
    
    if (filters?.status) {
      filtered = filtered.filter(i => i.status === filters.status);
    }
    
    if (filters?.from) {
      filtered = filtered.filter(i => i.createdAt >= new Date(filters.from!));
    }
    
    if (filters?.to) {
      filtered = filtered.filter(i => i.createdAt <= new Date(filters.to!));
    }
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(i =>
        i.id.toLowerCase().includes(query) ||
        i.customerName.toLowerCase().includes(query) ||
        i.customerId.toLowerCase().includes(query) ||
        i.reference1?.toLowerCase().includes(query) ||
        i.reference2?.toLowerCase().includes(query)
      );
    }
    
    if (filters?.unpaid) {
      filtered = filtered.filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.VOID);
    }
    
    if (filters?.exportStatus) {
      const invoiceIds = this.accountingExports
        .filter(e => e.status === filters.exportStatus)
        .map(e => e.invoiceId);
      filtered = filtered.filter(i => invoiceIds.includes(i.id));
    }
    
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  getInvoiceById(id: string) {
    return this.invoices.find(i => i.id === id);
  }
  
  getInvoiceLines(invoiceId: string) {
    return this.invoiceLines.filter(l => l.invoiceId === invoiceId);
  }
  
  getPaymentsByInvoice(invoiceId: string) {
    return this.payments.filter(p => p.invoiceId === invoiceId);
  }
  
  getAccountingExportsByInvoice(invoiceId: string) {
    return this.accountingExports.filter(e => e.invoiceId === invoiceId);
  }
  
  // Create invoice from booking group (idempotent)
  createInvoiceFromGroup(bookingGroupId: string, userId: string = 'Staff') {
    // Find bookings in group
    const bookings = this.bookings.filter(b => 
      b.groupName === bookingGroupId && b.status !== BookingStatus.CANCELLED
    );
    
    if (bookings.length === 0) {
      throw new Error('No bookings found for group');
    }
    
    // Check if invoice already exists for this group (idempotency)
    const existingInvoice = this.invoices.find(inv => 
      inv.bookingGroupId === bookingGroupId && inv.status !== InvoiceStatus.VOID
    );
    
    if (existingInvoice) {
      this.logAction('BILLING', userId, 'INVOICE_GENERATE_ATTEMPT', `Attempted to generate invoice for group ${bookingGroupId}, but one already exists (${existingInvoice.id})`);
      return existingInvoice;
    }
    
    // Get meal orders linked to this group (exclude cancelled)
    const mealOrders = this.meals.filter(m => 
      m.bookingGroupId === bookingGroupId && 
      m.status !== MealOrderStatus.CANCELLED
    );
    
    // Check idempotency: ensure no duplicate lines for same sourceId
    const existingLineSourceIds = new Set<string>();
    this.invoiceLines.forEach(line => {
      if (line.sourceId) existingLineSourceIds.add(`${line.sourceType}-${line.sourceId}`);
    });
    
    const now = new Date();
    const primaryBooking = bookings[0];
    const invoiceId = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Build ROOM lines
    const roomLines: IInvoiceLine[] = bookings.map(b => {
      const nights = Math.ceil((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const room = this.getRoomById(b.roomId);
      const unitPrice = b.pricePerNightOverride || room?.pricePerNight || 0;
      const lineTotal = unitPrice * nights;
      const vatCode = VatCode.VAT_25; // Lodging VAT
      const vatAmount = lineTotal * (vatCode / 100);
      
      const lineId = `LINE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      return {
        id: lineId,
        invoiceId,
        sourceType: InvoiceLineSourceType.ROOM,
        sourceId: b.id,
        description: `Stay: ${b.startDate} to ${b.endDate} (Unit ${room?.number || b.roomId})`,
        quantity: nights,
        unitPrice,
        vatCode,
        vatAmount,
        lineTotal,
        createdAt: now,
        updatedAt: now
      };
    });

    // Build MEAL lines
    const mealLines: IInvoiceLine[] = mealOrders
      .filter(mo => {
        const key = `${InvoiceLineSourceType.MEAL}-${mo.id}`;
        return !existingLineSourceIds.has(key);
      })
      .map(mo => {
        const item = this.kitchenItems.find(i => i.id === mo.kitchenItemId);
        const unitPrice = item?.unitPrice || 0;
        const vatCode = item?.vatCode || VatCode.VAT_15;
        const lineTotal = unitPrice * mo.quantity;
        const vatAmount = lineTotal * (vatCode / 100);
        
        const lineId = `LINE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        return {
          id: lineId,
          invoiceId,
          sourceType: InvoiceLineSourceType.MEAL,
          sourceId: mo.id,
          description: `${item?.name || 'Meal'} x${mo.quantity}${mo.referenceText ? ` (${mo.referenceText})` : ''}${mo.servingLocation ? ` - ${mo.servingLocation}` : ''}`,
          quantity: mo.quantity,
          unitPrice,
          vatCode,
          vatAmount,
          lineTotal,
          createdAt: now,
          updatedAt: now
        };
      });
    
    // Build FEE lines
    const feeLines: IInvoiceLine[] = bookings.flatMap(b => 
      (b.extraFees || []).map(f => {
        const lineTotal = f.amount;
        const vatAmount = lineTotal * (f.vatCode / 100);
        const lineId = `LINE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        return {
          id: lineId,
          invoiceId,
          sourceType: InvoiceLineSourceType.FEE,
          sourceId: f.id,
      description: f.description,
          quantity: 1,
          unitPrice: f.amount,
          vatCode: f.vatCode,
          vatAmount,
          lineTotal,
          createdAt: now,
          updatedAt: now
        };
      })
    );
    
    // Check if we have any billable lines
    const allLines = [...roomLines, ...mealLines, ...feeLines];
    if (allLines.length === 0) {
      throw new Error('No billable lines found for this booking group');
    }
    
    // Calculate totals
    const subtotal = allLines.reduce((sum, l) => sum + (l.lineTotal - l.vatAmount), 0);
    const vatTotal = allLines.reduce((sum, l) => sum + l.vatAmount, 0);
    const total = subtotal + vatTotal;
    
    // Create invoice
    const invoice: IInvoice = {
      id: invoiceId,
      bookingGroupId,
      customerId: primaryBooking.customerId || primaryBooking.customerName,
      customerName: primaryBooking.groupName || primaryBooking.customerName,
      status: InvoiceStatus.DRAFT,
      reference1: primaryBooking.reference1 || '',
      reference2: primaryBooking.reference2 || '',
      currency: 'NOK',
      subtotal,
      vatTotal,
      total,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now
    };
    
    this.invoices.push(invoice);
    this.invoiceLines.push(...allLines);
    
    this.logAction('BILLING', userId, 'INVOICE_CREATE', `Invoice created from booking group ${bookingGroupId} with ${allLines.length} line(s): ${roomLines.length} room, ${mealLines.length} meal, ${feeLines.length} fee`);
    
    return invoice;
  }

  // Update invoice (draft-only, finance-only)
  updateInvoice(id: string, updates: {
    reference1?: string;
    reference2?: string;
    dueDate?: Date;
  }, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === id);
    if (!invoice) throw new Error('Invoice not found');
    
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be edited');
    }
    
    if (updates.reference1 !== undefined) {
      invoice.reference1 = updates.reference1;
      this.logAction('BILLING', userId, 'INVOICE_UPDATE', `Invoice reference1 updated`);
    }
    
    if (updates.reference2 !== undefined) {
      invoice.reference2 = updates.reference2;
      this.logAudit({
        actorUserId: userId,
        actorRoles: this.getUserRoles(userId),
        action: AuditAction.INVOICE_REFERENCE_UPDATED,
        entityType: AuditEntityType.INVOICE,
        entityId: id,
        message: `Invoice reference2 updated: ${invoice.reference2}`,
        before: { reference2: oldRef2 },
        after: { reference2: invoice.reference2 }
      });
    }
    
    if (updates.dueDate !== undefined) {
      invoice.dueDate = updates.dueDate;
    }
    
    invoice.updatedAt = new Date();
    return invoice;
  }
  
  // Send invoice (marks as SENT)
  sendInvoice(id: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === id);
    if (!invoice) throw new Error('Invoice not found');
    
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be sent');
    }
    
    invoice.status = InvoiceStatus.SENT;
    invoice.issuedAt = new Date();
    invoice.updatedAt = new Date();
    
    this.logAction('BILLING', userId, 'INVOICE_SEND', `Invoice ${id} sent to customer`);
    return invoice;
  }
  
  // Mark invoice as paid
  markInvoicePaid(id: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === id);
    if (!invoice) throw new Error('Invoice not found');
    
    if (invoice.status === InvoiceStatus.VOID) {
      throw new Error('Cannot mark void invoice as paid');
    }
    
    invoice.status = InvoiceStatus.PAID;
    invoice.updatedAt = new Date();
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.INVOICE_STATUS_CHANGED,
      entityType: AuditEntityType.INVOICE,
      entityId: id,
      message: `Invoice ${id} marked as paid`,
      before: { status: InvoiceStatus.SENT },
      after: { status: InvoiceStatus.PAID }
    });
    return invoice;
  }
  
  // Void invoice
  voidInvoice(id: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === id);
    if (!invoice) throw new Error('Invoice not found');
    
    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot void paid invoice');
    }
    
    invoice.status = InvoiceStatus.VOID;
    invoice.updatedAt = new Date();
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.INVOICE_STATUS_CHANGED,
      entityType: AuditEntityType.INVOICE,
      entityId: id,
      message: `Invoice ${id} voided`,
      before: { status: invoice.status },
      after: { status: InvoiceStatus.VOID }
    });
    return invoice;
  }
  
  // Add invoice line (finance-only, draft-only)
  addInvoiceLine(invoiceId: string, line: Omit<IInvoiceLine, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be edited');
    }
    
    const vatAmount = line.lineTotal * (line.vatCode / 100);
    const newLine: IInvoiceLine = {
      ...line,
      id: `LINE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      invoiceId,
      vatAmount,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.invoiceLines.push(newLine);
    
    // Recalculate totals
    this.recalculateInvoiceTotals(invoiceId);
    
    this.logAction('BILLING', userId, 'INVOICE_LINE_ADD', `Invoice line added (${line.sourceType}: ${line.description})`);
    return newLine;
  }
  
  // Update invoice line (draft-only)
  updateInvoiceLine(lineId: string, updates: Partial<IInvoiceLine>, userId: string = 'Staff') {
    const line = this.invoiceLines.find(l => l.id === lineId);
    if (!line) throw new Error('Invoice line not found');
    
    const invoice = this.invoices.find(i => i.id === line.invoiceId);
    if (!invoice || invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be edited');
    }
    
    Object.assign(line, updates);
    line.updatedAt = new Date();
    
    // Recalculate VAT and totals if price/quantity changed
    if (updates.unitPrice !== undefined || updates.quantity !== undefined) {
      line.lineTotal = line.unitPrice * line.quantity;
      line.vatAmount = line.lineTotal * (line.vatCode / 100);
    }
    
    this.recalculateInvoiceTotals(line.invoiceId);
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.INVOICE_LINE_UPDATED,
      entityType: AuditEntityType.INVOICE_LINE,
      entityId: id,
      message: `Invoice line updated`,
      before: { quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal },
      after: { quantity: updates.quantity || line.quantity, unitPrice: updates.unitPrice || line.unitPrice, lineTotal: line.lineTotal },
      metadata: { invoiceId: line.invoiceId }
    });
    return line;
  }
  
  // Delete invoice line (draft-only)
  deleteInvoiceLine(lineId: string, userId: string = 'Staff') {
    const line = this.invoiceLines.find(l => l.id === lineId);
    if (!line) throw new Error('Invoice line not found');
    
    const invoice = this.invoices.find(i => i.id === line.invoiceId);
    if (!invoice || invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be edited');
    }
    
    this.invoiceLines = this.invoiceLines.filter(l => l.id !== lineId);
    this.recalculateInvoiceTotals(line.invoiceId);
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.INVOICE_LINE_REMOVED,
      entityType: AuditEntityType.INVOICE_LINE,
      entityId: id,
      message: `Invoice line deleted (${line.sourceType}: ${line.description})`,
      before: { sourceType: line.sourceType, description: line.description, quantity: line.quantity, lineTotal: line.lineTotal },
      metadata: { invoiceId: line.invoiceId }
    });
  }
  
  // Recalculate invoice totals
  private recalculateInvoiceTotals(invoiceId: string) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    const lines = this.invoiceLines.filter(l => l.invoiceId === invoiceId);
    invoice.subtotal = lines.reduce((sum, l) => sum + (l.lineTotal - l.vatAmount), 0);
    invoice.vatTotal = lines.reduce((sum, l) => sum + l.vatAmount, 0);
    invoice.total = invoice.subtotal + invoice.vatTotal;
    invoice.updatedAt = new Date();
  }
  
  // Create payment link
  async createPaymentLink(invoiceId: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const result = await integrations.generatePaymentLink(invoiceId, invoice.total, invoice.currency);
    if (!result.success || !result.link) {
      throw new Error(result.error || 'Failed to generate payment link');
    }
    
    const payment: IPayment = {
      id: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      invoiceId,
      method: PaymentMethodEnum.PAYMENT_LINK,
      status: PaymentStatus.PENDING,
      amount: invoice.total,
      currency: invoice.currency,
      externalRef: result.link,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.payments.push(payment);
    
    // Auto-send invoice if still draft
    if (invoice.status === InvoiceStatus.DRAFT) {
      invoice.status = InvoiceStatus.SENT;
      invoice.issuedAt = new Date();
    }
    
    invoice.updatedAt = new Date();
    
    this.logAction('BILLING', userId, 'PAYMENT_LINK_CREATE', `Payment link created for invoice ${invoiceId}`);
    return payment;
  }

  // Initiate NETS terminal payment
  async initiateNetsTerminal(invoiceId: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const result = await integrations.initiateNetsPayment(invoice.total, invoice.currency);
    if (!result.success || !result.transactionId) {
      throw new Error(result.error || 'Failed to initiate NETS payment');
    }
    
    const payment: IPayment = {
      id: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      invoiceId,
      method: PaymentMethodEnum.NETS_TERMINAL,
      status: PaymentStatus.PENDING,
      amount: invoice.total,
      currency: invoice.currency,
      externalRef: result.transactionId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.payments.push(payment);
    invoice.updatedAt = new Date();
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.PAYMENT_CREATED,
      entityType: AuditEntityType.PAYMENT,
      entityId: payment.id,
      message: `NETS terminal payment initiated for invoice ${invoiceId}`,
      after: { method: PaymentMethodEnum.NETS_TERMINAL, status: PaymentStatus.PENDING, amount: payment.amount },
      metadata: { invoiceId }
    });
    return payment;
  }
  
  // Export to Visma
  async exportToVisma(invoiceId: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    // Validate references
    if (!invoice.reference1 || !invoice.reference2) {
      throw new Error('Invoice references (reference1 and reference2) are required for Visma export');
    }
    
    const lines = this.getInvoiceLines(invoiceId);
    const result = await integrations.exportToVisma(invoice, lines);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to export to Visma');
    }
    
    const exportRecord: IAccountingExport = {
      id: `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      invoiceId,
      targetSystem: 'VISMA',
      status: AccountingExportStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.accountingExports.push(exportRecord);
    
    this.logAction('BILLING', userId, 'VISMA_EXPORT_QUEUED', `Visma export queued for invoice ${invoiceId}`);
    
    // Poll for status update (in real system, this would be async)
    setTimeout(() => {
      const outboxEvents = integrations.getOutboxByInvoice(invoiceId);
      const latestEvent = outboxEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (latestEvent) {
        if (latestEvent.status === 'PROCESSED') {
          exportRecord.status = AccountingExportStatus.SENT;
        } else if (latestEvent.status === 'FAILED') {
          exportRecord.status = AccountingExportStatus.FAILED;
          exportRecord.lastError = latestEvent.lastError;
        }
        exportRecord.updatedAt = new Date();
      }
    }, 1000);
    
    return exportRecord;
  }
  
  // Retry Visma export
  async retryVismaExport(exportId: string, userId: string = 'Staff') {
    const exportRecord = this.accountingExports.find(e => e.id === exportId);
    if (!exportRecord) throw new Error('Export record not found');
    
    if (exportRecord.status !== AccountingExportStatus.FAILED) {
      throw new Error('Can only retry failed exports');
    }
    
    const invoice = this.invoices.find(i => i.id === exportRecord.invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const lines = this.getInvoiceLines(exportRecord.invoiceId);
    const result = await integrations.exportToVisma(invoice, lines);
    
    if (!result.success) {
      exportRecord.lastError = result.error;
      exportRecord.updatedAt = new Date();
      throw new Error(result.error || 'Retry failed');
    }
    
    exportRecord.status = AccountingExportStatus.PENDING;
    exportRecord.lastError = undefined;
    exportRecord.updatedAt = new Date();
    
    this.logAction('BILLING', userId, 'VISMA_EXPORT_RETRY', `Visma export retry initiated for invoice ${exportRecord.invoiceId}`);
    return exportRecord;
  }

  // Legacy method for backward compatibility
  getPaymentLink(paymentId: string) {
    const payment = this.payments.find(p => p.id === paymentId);
    return payment?.externalRef;
  }

  // Maintenance Tickets
  getTickets(filters?: { 
    unitId?: string; 
    status?: MaintenanceTicketStatus; 
    severity?: MaintenanceSeverity; 
    category?: MaintenanceCategory; 
    q?: string;
    blockedOnly?: boolean;
  }) {
    let filtered = [...this.tickets];
    
    if (filters?.unitId) {
      filtered = filtered.filter(t => t.unitId === filters.unitId);
    }
    
    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    
    if (filters?.severity) {
      filtered = filtered.filter(t => t.severity === filters.severity);
    }
    
    if (filters?.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        this.getRoomById(t.unitId)?.number.toLowerCase().includes(query)
      );
    }
    
    if (filters?.blockedOnly) {
      filtered = filtered.filter(t => {
        const room = this.getRoomById(t.unitId);
        return room?.status === RoomStatus.OUT_OF_SERVICE;
      });
    }
    
    return filtered.sort((a, b) => {
      // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW), then by updatedAt
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
  
  getTicketById(id: string) {
    return this.tickets.find(t => t.id === id);
  }
  
  getTicketsByUnit(unitId: string) {
    return this.tickets.filter(t => t.unitId === unitId && t.status !== MaintenanceTicketStatus.CLOSED);
  }
  
  getTicketAttachments(ticketId: string) {
    return this.ticketAttachments.filter(a => a.ticketId === ticketId);
  }
  
  getRoomImpact(roomId: string) {
    const room = this.getRoomById(roomId);
    if (!room) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureBookings = this.bookings.filter(b => 
      b.roomId === roomId &&
      b.status !== BookingStatus.CANCELLED &&
      new Date(b.startDate) >= today
    );
    
    const nextBooking = futureBookings
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
    
    const activeBooking = this.bookings.find(b => 
      b.roomId === roomId &&
      b.status === BookingStatus.CHECKED_IN
    );
    
    return {
      futureReservationsCount: futureBookings.length,
      nextArrival: nextBooking ? {
        date: nextBooking.startDate,
        time: nextBooking.checkInTime || '15:00',
        customerName: nextBooking.customerName
      } : null,
      isOccupied: !!activeBooking,
      currentBooking: activeBooking
    };
  }
  
  addTicket(ticket: Omit<IMaintenanceTicket, 'id' | 'requestedAt' | 'updatedAt' | 'status'>, userId: string = 'Staff') {
    if (!ticket.unitId || !ticket.title || !ticket.description || !ticket.category || !ticket.severity) {
      throw new Error('Missing required ticket fields');
    }
    
    const now = new Date();
    const newTicket: IMaintenanceTicket = {
      ...ticket,
      id: `MT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: MaintenanceTicketStatus.OPEN,
      reportedByUserId: userId,
      requestedAt: now,
      updatedAt: now,
      requiresBlocking: ticket.requiresBlocking || false
    };
    
    this.tickets.push(newTicket);
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.MAINTENANCE_TICKET_CREATED,
      entityType: AuditEntityType.TICKET,
      entityId: newTicket.id,
      message: `Maintenance ticket created (Category: ${ticket.category}, Severity: ${ticket.severity}) - Unit ${this.getRoomById(ticket.unitId)?.number || ticket.unitId}`,
      after: { category: ticket.category, severity: ticket.severity, unitId: ticket.unitId, title: ticket.title },
      metadata: { unitId: ticket.unitId, requiresBlocking: ticket.requiresBlocking || false }
    });
    
    return newTicket;
  }
  
  updateTicket(id: string, updates: {
    status?: MaintenanceTicketStatus;
    severity?: MaintenanceSeverity;
    assignedToUserId?: string;
    description?: string;
    title?: string;
  }, userId: string = 'Staff') {
    const ticket = this.tickets.find(t => t.id === id);
    if (!ticket) throw new Error('Ticket not found');
    
    const oldStatus = ticket.status;
    const oldAssigned = ticket.assignedToUserId;
    
    if (updates.status !== undefined) {
      // Validate status transition
      const validTransitions: Record<MaintenanceTicketStatus, MaintenanceTicketStatus[]> = {
        [MaintenanceTicketStatus.OPEN]: [MaintenanceTicketStatus.TRIAGED, MaintenanceTicketStatus.CLOSED],
        [MaintenanceTicketStatus.TRIAGED]: [MaintenanceTicketStatus.IN_PROGRESS, MaintenanceTicketStatus.OPEN, MaintenanceTicketStatus.CLOSED],
        [MaintenanceTicketStatus.IN_PROGRESS]: [MaintenanceTicketStatus.WAITING_PARTS, MaintenanceTicketStatus.RESOLVED, MaintenanceTicketStatus.CLOSED],
        [MaintenanceTicketStatus.WAITING_PARTS]: [MaintenanceTicketStatus.IN_PROGRESS, MaintenanceTicketStatus.RESOLVED, MaintenanceTicketStatus.CLOSED],
        [MaintenanceTicketStatus.RESOLVED]: [MaintenanceTicketStatus.CLOSED, MaintenanceTicketStatus.IN_PROGRESS],
        [MaintenanceTicketStatus.CLOSED]: []
      };
      
      if (!validTransitions[oldStatus].includes(updates.status)) {
        throw new Error(`Invalid status transition: ${oldStatus} -> ${updates.status}`);
      }
      
      ticket.status = updates.status;
      if (updates.status === MaintenanceTicketStatus.RESOLVED || updates.status === MaintenanceTicketStatus.CLOSED) {
        ticket.resolvedAt = new Date();
      }
      
      const action = updates.status === MaintenanceTicketStatus.RESOLVED 
        ? AuditAction.MAINTENANCE_TICKET_RESOLVED
        : AuditAction.MAINTENANCE_TICKET_STATUS_CHANGED;
      this.logAudit({
        actorUserId: userId,
        actorRoles: this.getUserRoles(userId),
        action,
        entityType: AuditEntityType.TICKET,
        entityId: id,
        message: `Ticket status changed: ${oldStatus} → ${updates.status}`,
        before: { status: oldStatus },
        after: { status: updates.status }
      });
    }
    
    if (updates.assignedToUserId !== undefined) {
      ticket.assignedToUserId = updates.assignedToUserId;
      if (oldAssigned !== updates.assignedToUserId) {
        this.logAudit({
          actorUserId: userId,
          actorRoles: this.getUserRoles(userId),
          action: AuditAction.MAINTENANCE_TICKET_ASSIGNED,
          entityType: AuditEntityType.TICKET,
          entityId: id,
          message: `Ticket assigned to ${updates.assignedToUserId}`,
          before: { assignedToUserId: oldAssigned },
          after: { assignedToUserId: updates.assignedToUserId }
        });
      }
    }
    
    if (updates.severity !== undefined) {
      ticket.severity = updates.severity;
    }
    
    if (updates.description !== undefined) {
      ticket.description = updates.description;
    }
    
    if (updates.title !== undefined) {
      ticket.title = updates.title;
    }
    
    ticket.updatedAt = new Date();
    return ticket;
  }
  
  addTicketAttachment(ticketId: string, attachment: Omit<ITicketAttachment, 'id' | 'ticketId' | 'createdAt'>, userId: string = 'Staff') {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    
    const newAttachment: ITicketAttachment = {
      ...attachment,
      id: Math.random().toString(36).substr(2, 9),
      ticketId,
      createdAt: new Date()
    };
    
    this.ticketAttachments.push(newAttachment);
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.MAINTENANCE_TICKET_UPDATED,
      entityType: AuditEntityType.TICKET,
      entityId: ticketId,
      message: `Attachment added to ticket: ${attachment.fileName}`,
      metadata: { attachmentId: newAttachment.id, fileName: attachment.fileName }
    });
    return newAttachment;
  }
  
  // Block Unit (OUT OF SERVICE) - Deliberate action with audit
  blockUnit(roomId: string, params: {
    reason: BlockReason;
    note?: string;
    expectedReturnAt?: string;
    linkedTicketId?: string;
  }, userId: string = 'Staff') {
    const room = this.getRoomById(roomId);
    if (!room) throw new Error('Room not found');
    
    if (room.status === RoomStatus.OUT_OF_SERVICE) {
      throw new Error('Unit is already out of service');
    }
    
    // Get impact before blocking
    const impact = this.getRoomImpact(roomId);
    
    // Update room status
    room.status = RoomStatus.OUT_OF_SERVICE;
    room.outOfServiceReason = params.reason;
    room.outOfServiceNote = params.note;
    room.expectedReturnDate = params.expectedReturnAt;
    room.linkedTicketId = params.linkedTicketId;
    
    // Update ticket if linked
    if (params.linkedTicketId) {
      const ticket = this.tickets.find(t => t.id === params.linkedTicketId);
      if (ticket) {
        ticket.blockedAt = new Date();
        ticket.blockedByUserId = userId;
        ticket.blockReason = params.reason;
        ticket.updatedAt = new Date();
      }
    }
    
    const impactMsg = impact?.futureReservationsCount 
      ? `${impact.futureReservationsCount} future reservation(s) affected`
      : 'No future reservations affected';
    
    this.logAction('ROOM', userId, 'UNIT_BLOCKED', `Unit set out of service (Reason: ${params.reason}). ${impactMsg}`);
    
    return {
      room,
      impact: impact || { futureReservationsCount: 0, nextArrival: null, isOccupied: false, currentBooking: null }
    };
  }
  
  // Restore Unit - Sets to DIRTY and clears blocking info
  restoreUnit(roomId: string, userId: string = 'Staff') {
    const room = this.getRoomById(roomId);
    if (!room) throw new Error('Room not found');
    
    if (room.status !== RoomStatus.OUT_OF_SERVICE) {
      throw new Error('Unit is not out of service');
    }
    
    const oldReason = room.outOfServiceReason;
    
    // Set to DIRTY (housekeeping must confirm clean)
    room.status = RoomStatus.DIRTY;
    
    // Clear blocking metadata (keep in audit)
    delete room.outOfServiceReason;
    delete room.outOfServiceNote;
    delete room.expectedReturnDate;
    // Keep linkedTicketId for audit trail
    
    // Update linked ticket if exists
    if (room.linkedTicketId) {
      const ticket = this.tickets.find(t => t.id === room.linkedTicketId);
      if (ticket && ticket.status === MaintenanceTicketStatus.RESOLVED) {
        // Ticket resolved, unit restored
      }
    }
    
    this.logAudit({
      actorUserId: userId,
      actorRoles: this.getUserRoles(userId),
      action: AuditAction.MAINTENANCE_BLOCK_REMOVED,
      entityType: AuditEntityType.ROOM,
      entityId: roomId,
      message: `Unit restored to service (condition set to DIRTY). Previous reason: ${oldReason || 'Unknown'}`,
      before: { status: RoomStatus.OUT_OF_SERVICE, reason: oldReason },
      after: { status: RoomStatus.DIRTY }
    });
    
    return room;
  }

  getLogs() { return this.auditLogs; }
  getAuditSummaries() { return this.auditSummaries; }
  runNightAudit(userId: string = 'Staff') {
    const today = new Date().toISOString().split('T')[0];
    const activeBookings = this.bookings.filter(b => b.status === BookingStatus.CHECKED_IN);
    const summary: IDailySummary = {
      date: today,
      roomNights: activeBookings.length,
      totalRevenue: activeBookings.reduce((sum, b) => sum + (this.getRoomById(b.roomId)?.pricePerNight || 0), 0),
      occupancyRate: activeBookings.length / this.rooms.length,
      closedAt: new Date().toISOString()
    };
    this.auditSummaries.push(summary);
    return summary;
  }

  // Reports - Occupancy Monthly
  getMonthlyOccupancyReport(month: number, year: number) {
    // Assumption: Rooms available = total active rooms (excluding currently OUT_OF_SERVICE)
    // This is a simplification - in production, track room availability by day
    const activeRooms = this.rooms.filter(r => r.status !== RoomStatus.OUT_OF_SERVICE);
    const roomsAvailable = activeRooms.length;
    
    // Calculate days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const roomNightsAvailable = roomsAvailable * daysInMonth;
    
    // Find bookings that overlap with the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    
    const relevantBookings = this.bookings.filter(b => {
      if (b.status === BookingStatus.CANCELLED) return false;
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      // Booking overlaps with month if start <= monthEnd and end >= monthStart
      return start <= monthEnd && end >= monthStart;
    });
    
    // Calculate room nights sold (nights within the month)
    let roomNightsSold = 0;
    let guestNights = 0;
    let arrivals = 0;
    let departures = 0;
    
    relevantBookings.forEach(b => {
      const bookingStart = new Date(b.startDate);
      const bookingEnd = new Date(b.endDate);
      
      // Calculate nights within the month
      const overlapStart = bookingStart < monthStart ? monthStart : bookingStart;
      const overlapEnd = bookingEnd > monthEnd ? monthEnd : bookingEnd;
      
      if (overlapStart <= overlapEnd) {
        const nights = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        roomNightsSold += nights;
        guestNights += nights * b.guestCount;
      }
      
      // Count arrivals (check-ins in this month)
      if (b.status === BookingStatus.CHECKED_IN || b.status === BookingStatus.CHECKED_OUT) {
        const checkInDate = b.checkInTime ? new Date(b.checkInTime.split('T')[0]) : bookingStart;
        if (checkInDate >= monthStart && checkInDate <= monthEnd) {
          arrivals++;
        }
      }
      
      // Count departures (check-outs in this month)
      if (b.status === BookingStatus.CHECKED_OUT && b.checkOutTime) {
        const checkOutDate = new Date(b.checkOutTime.split('T')[0]);
        if (checkOutDate >= monthStart && checkOutDate <= monthEnd) {
          departures++;
        }
      }
    });
    
    const occupancyRate = roomNightsAvailable > 0 ? (roomNightsSold / roomNightsAvailable) * 100 : 0;
    
    // Optional: Breakdown by room type
    const byRoomType: Record<string, {
      roomsAvailable: number;
      roomNightsSold: number;
      guestNights: number;
      occupancyRate: number;
    }> = {};
    
    activeRooms.forEach(room => {
      if (!byRoomType[room.type]) {
        byRoomType[room.type] = {
          roomsAvailable: 0,
          roomNightsSold: 0,
          guestNights: 0,
          occupancyRate: 0
        };
      }
      byRoomType[room.type].roomsAvailable++;
    });
    
    // Calculate room type breakdowns
    Object.keys(byRoomType).forEach(type => {
      const typeRooms = activeRooms.filter(r => r.type === type);
      const typeRoomNightsAvailable = typeRooms.length * daysInMonth;
      let typeRoomNightsSold = 0;
      let typeGuestNights = 0;
      
      relevantBookings.forEach(b => {
        const room = this.getRoomById(b.roomId);
        if (room?.type === type) {
          const bookingStart = new Date(b.startDate);
          const bookingEnd = new Date(b.endDate);
          const overlapStart = bookingStart < monthStart ? monthStart : bookingStart;
          const overlapEnd = bookingEnd > monthEnd ? monthEnd : bookingEnd;
          
          if (overlapStart <= overlapEnd) {
            const nights = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            typeRoomNightsSold += nights;
            typeGuestNights += nights * b.guestCount;
          }
        }
      });
      
      byRoomType[type].roomNightsSold = typeRoomNightsSold;
      byRoomType[type].guestNights = typeGuestNights;
      byRoomType[type].occupancyRate = typeRoomNightsAvailable > 0 
        ? (typeRoomNightsSold / typeRoomNightsAvailable) * 100 
        : 0;
    });
    
    return {
      month,
      year,
      totals: {
        roomsAvailable,
        roomNightsSold,
        guestNights,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        arrivals,
        departures
      },
      byRoomType
    };
  }
  
  // Reports - Occupancy Yearly
  getYearlyOccupancyReport(year: number) {
    const months: Array<{
      month: number;
      monthName: string;
      roomsAvailable: number;
      roomNightsSold: number;
      guestNights: number;
      occupancyRate: number;
      arrivals: number;
      departures: number;
    }> = [];
    
    let yearTotals = {
      roomsAvailable: 0,
      roomNightsSold: 0,
      guestNights: 0,
      occupancyRate: 0,
      arrivals: 0,
      departures: 0
    };
    
    for (let month = 1; month <= 12; month++) {
      const monthly = this.getMonthlyOccupancyReport(month, year);
      const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
      
      months.push({
        month,
        monthName,
        ...monthly.totals
      });
      
      yearTotals.roomNightsSold += monthly.totals.roomNightsSold;
      yearTotals.guestNights += monthly.totals.guestNights;
      yearTotals.arrivals += monthly.totals.arrivals;
      yearTotals.departures += monthly.totals.departures;
    }
    
    // Year totals: use average rooms available
    const activeRooms = this.rooms.filter(r => r.status !== RoomStatus.OUT_OF_SERVICE).length;
    yearTotals.roomsAvailable = activeRooms;
    const yearRoomNightsAvailable = activeRooms * 365; // Simplified: assume 365 days
    yearTotals.occupancyRate = yearRoomNightsAvailable > 0 
      ? Math.round((yearTotals.roomNightsSold / yearRoomNightsAvailable) * 100 * 100) / 100 
      : 0;
    
    return {
      year,
      months,
      yearTotals
    };
  }
  
  // Reports - Invoice History
  getInvoiceHistoryReport(filters?: {
    from?: string;
    to?: string;
    status?: InvoiceStatus;
    q?: string;
    exportStatus?: AccountingExportStatus;
    page?: number;
    pageSize?: number;
  }) {
    let invoices = this.getInvoices({
      status: filters?.status,
      from: filters?.from,
      to: filters?.to,
      q: filters?.q,
      exportStatus: filters?.exportStatus
    });
    
    // Get payment and export status for each invoice
    const enriched = invoices.map(inv => {
      const payments = this.getPaymentsByInvoice(inv.id);
      const exports = this.getAccountingExportsByInvoice(inv.id);
      const latestExport = exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      const paymentStatus = payments.find(p => p.status === PaymentStatus.SUCCEEDED) 
        ? 'Paid' 
        : payments.find(p => p.status === PaymentStatus.PENDING) 
        ? 'Pending' 
        : 'None';
      
      return {
        ...inv,
        paymentStatus,
        exportStatus: latestExport?.status || null,
        exportError: latestExport?.lastError || null
      };
    });
    
    // Pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const total = enriched.length;
    const paginated = enriched.slice((page - 1) * pageSize, page * pageSize);
    
    // Aggregates
    const aggregates = {
      count: total,
      sumTotal: enriched.reduce((sum, inv) => sum + inv.total, 0),
      sumOutstanding: enriched
        .filter(inv => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.VOID)
        .reduce((sum, inv) => sum + inv.total, 0)
    };
    
    return {
      invoices: paginated,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      aggregates
    };
  }
  
  // Legacy method for backward compatibility
  getMonthlyReport() {
    const now = new Date();
    const monthly = this.getMonthlyOccupancyReport(now.getMonth() + 1, now.getFullYear());
    return {
      totalRevenue: this.auditSummaries.reduce((a, b) => a + b.totalRevenue, 0),
      avgOccupancy: monthly.totals.occupancyRate / 100,
      totalNights: monthly.totals.roomNightsSold
    };
  }
}

export const store = new StoreService();
