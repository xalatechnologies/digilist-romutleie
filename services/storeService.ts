import { 
  IRoom, IBooking, RoomStatus, RoomType, BookingStatus, 
  IMealOrder, IMaintenanceTicket, IInvoice, IHousekeepingTask, 
  IKitchenItem, IDailySummary, IAuditLog, MaintenancePriority, IPayment,
  CustomerType, PaymentMethod, IRoomSummary, RoomOccupancy
} from '../types';

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
  { id: 'k1', name: 'Breakfast Buffet', price: 150, vatCode: 15, active: true },
  { id: 'k2', name: 'Packed Lunch', price: 120, vatCode: 15, active: true },
  { id: 'k3', name: '3-Course Dinner', price: 450, vatCode: 15, active: true },
  { id: 'k4', name: 'Coffee & Snack', price: 75, vatCode: 15, active: true },
];

class StoreService {
  private rooms: IRoom[] = [...INITIAL_ROOMS];
  private bookings: IBooking[] = [...INITIAL_BOOKINGS];
  private kitchenItems: IKitchenItem[] = [...INITIAL_KITCHEN_ITEMS];
  private meals: IMealOrder[] = [];
  private housekeepingTasks: IHousekeepingTask[] = [];
  private tickets: IMaintenanceTicket[] = [];
  private invoices: IInvoice[] = [];
  private payments: IPayment[] = [];
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
    this.logAction('SYSTEM', 'Admin', 'SYSTEM_INIT', 'System store initialized with enhanced availability logic');
  }

  private logAction(domain: IAuditLog['domain'], userId: string, action: string, details: string) {
    const log: IAuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      userId,
      action,
      domain,
      details
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
  }

  getRooms() { return this.rooms; }
  getRoomById(id: string) { return this.rooms.find(r => r.id === id); }
  
  updateRoomStatus(id: string, status: RoomStatus, userId: string = 'Staff', reason?: string, note?: string, returnDate?: string, ticketId?: string) {
    const room = this.rooms.find(r => r.id === id);
    if (room) {
      const oldStatus = room.status;
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

      // Human-readable log generation
      let logMessage = '';
      if (status === RoomStatus.OUT_OF_SERVICE) {
         logMessage = `Unit set out of service (${reason || 'No reason'})`;
      } else if (oldStatus === RoomStatus.OUT_OF_SERVICE && status !== RoomStatus.OUT_OF_SERVICE) {
         logMessage = `Unit restored to service (condition set to ${status})`;
      } else {
         logMessage = `Housekeeping status changed: ${oldStatus} -> ${status}`;
      }

      this.logAction('ROOM', userId, 'STATUS_CHANGE', logMessage);
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

  isRoomAvailable(roomId: string, startDate: string, endDate: string): boolean {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || room.status === RoomStatus.OUT_OF_SERVICE) return false;
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    const overlaps = this.bookings.some(b => {
      if (b.roomId !== roomId) return false;
      if (b.status === BookingStatus.CANCELLED) return false;
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return newStart < bEnd && newEnd > bStart;
    });
    return !overlaps;
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
    
    // Process meal orders
    mealOrders.forEach(m => {
      this.addMeal({ ...m, bookingId, status: 'Pending' }, userId);
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
      this.logAction('BOOKING', userId, 'STATUS_CHANGE', `Booking ${id}: ${oldStatus} -> ${status}`);
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

  // Kitchen
  getKitchenItems() { return this.kitchenItems; }
  getMeals() { return this.meals; }
  addMeal(meal: Omit<IMealOrder, 'id'>, userId: string = 'Staff') {
    const newMeal = { ...meal, id: Math.random().toString(36).substr(2, 9) };
    this.meals.push(newMeal);
    return newMeal;
  }
  updateMealStatus(id: string, status: 'Pending' | 'Served', userId: string = 'Staff') {
    const meal = this.meals.find(m => m.id === id);
    if (meal) {
      meal.status = status;
    }
    return [...this.meals];
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

  // Invoices & Payments
  getInvoices() { return this.invoices; }
  generateInvoice(bookingId: string, userId: string = 'Staff') {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return null;
    
    const bookingMeals = this.meals.filter(m => m.bookingId === booking.id);
    const mealLines = bookingMeals.map(m => {
      const item = this.kitchenItems.find(k => k.id === m.itemId);
      return {
        description: `${m.type} x${m.qty} (${m.servingLocation || 'Dining Room'})`,
        qty: m.qty,
        price: item ? item.price : 0,
        vat: item ? item.vatCode : 15
      };
    });

    const feeLines = (booking.extraFees || []).map(f => ({
      description: f.description,
      qty: 1,
      price: f.amount,
      vat: f.vatCode
    }));

    const invoice: IInvoice = {
      id: `INV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      bookingId: booking.id,
      customerName: booking.customerName,
      amount: booking.totalPrice + mealLines.reduce((acc, l) => acc + (l.price * l.qty), 0),
      status: 'DRAFT',
      reference1: booking.reference1 || '',
      reference2: booking.reference2 || '',
      lines: [
        { description: `Stay: ${booking.startDate} to ${booking.endDate}`, qty: 1, price: booking.totalPrice, vat: 25 },
        ...mealLines,
        ...feeLines
      ]
    };
    this.invoices.push(invoice);
    return invoice;
  }

  createPayment(invoiceId: string, userId: string = 'Staff') {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    const payment: IPayment = {
      id: `PAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      invoiceId: invoice.id,
      amount: invoice.amount,
      status: 'PENDING',
      createdAt: new Date(),
      paymentLink: `https://pay.digilist.no/checkout/${Math.random().toString(36).substr(2, 12)}`
    };
    this.payments.push(payment);
    invoice.paymentId = payment.id;
    invoice.status = 'SENT';
    return payment;
  }

  getPaymentLink(paymentId: string) {
    return this.payments.find(p => p.id === paymentId)?.paymentLink;
  }

  // Maintenance
  getTickets() { return this.tickets; }
  addTicket(ticket: Omit<IMaintenanceTicket, 'id' | 'createdAt' | 'status'>, userId: string = 'Staff') {
    const newTicket: IMaintenanceTicket = {
      ...ticket,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      status: 'Open'
    };
    this.tickets.push(newTicket);
    if (ticket.priority === MaintenancePriority.HIGH) {
      this.updateRoomStatus(ticket.roomId, RoomStatus.OUT_OF_SERVICE, 'Auto-Mtc');
    }
    return newTicket;
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

  getMonthlyReport() {
    return {
      totalRevenue: this.auditSummaries.reduce((a, b) => a + b.totalRevenue, 0),
      avgOccupancy: this.auditSummaries.reduce((a, b) => a + b.occupancyRate, 0) / (this.auditSummaries.length || 1),
      totalNights: this.auditSummaries.reduce((a, b) => a + b.roomNights, 0)
    };
  }
}

export const store = new StoreService();
