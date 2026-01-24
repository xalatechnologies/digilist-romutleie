import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  store 
} from '../services/storeService';
import { integrations } from '../services/integrationService';
import { generateDailyBriefing } from '../services/geminiService';
import { 
  Card, Text, Button, Badge, Stack, Input, Textarea, Select, Modal, Label,
  PageHeader, FilterBar, DataTable, DetailDrawer, MoneyValue
} from './XalaUI';
import { 
  Bed, Utensils, Wrench, FileText, ClipboardList, CheckCircle2, AlertTriangle, Send,
  Plus, Trash2, Download, PieChart, TrendingUp, Sparkles, Loader2, Calendar, User, Info, XCircle, Search as SearchIcon, 
  Clock, MapPin, HardHat, Link as LinkIcon, Copy, ExternalLink, QrCode, Building2, UserCircle, Briefcase, CreditCard, ChevronDown, ChevronRight, ChevronLeft,
  ShieldCheck, ArrowRight, Save, X, Moon, Filter, XSquare, AlertCircle, Ban, History, Shield, Mail
} from 'lucide-react';
import { 
  RoomStatus, BookingStatus, IKitchenItem, IHousekeepingTask, RoomType, MaintenancePriority, 
  IRoom, IInvoice, IBooking, IMaintenanceTicket, IPayment, CustomerType, PaymentMethod, IExtraFee, IMealOrder,
  RoomOccupancy, IRoomSummary, MealOrderStatus, VatCode, MaintenanceCategory, MaintenanceSeverity,
  MaintenanceTicketStatus, ITicketAttachment, BlockReason, InvoiceStatus, IInvoiceLine,
  PaymentMethodEnum, PaymentStatus, IAccountingExport, AccountingExportStatus, InvoiceLineSourceType,
  AuditEntityType, AuditAction, IAuditLog
} from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { generateCSV, downloadCSV } from '../utils/csvExport';
import { fetchRoomSummaries, fetchRoomDetail } from '../services/roomApiService';

// --- PAYMENT LINK MODAL ---
const PaymentLinkModal: React.FC<{
  payment: IPayment;
  isOpen: boolean;
  onClose: () => void;
}> =({ payment, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const paymentLink = payment.externalRef || '';
  
  const handleCopy = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  if (!paymentLink) {
  return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('payment.paymentInfo', 'Payment Information')}>
        <Stack spacing={4}>
          <Text size="sm" muted>{t('payment.noLinkAvailable', 'No payment link available for this payment method.')}</Text>
          <Button variant="outline" className="w-full" onClick={onClose}>{t('common.close')}</Button>
        </Stack>
      </Modal>
    );
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('payment.securePaymentLink', 'Secure Payment Link')}>
      <Stack spacing={8} className="py-4">
        <div className="flex flex-col items-center justify-center p-8 bg-primary/5 border border-primary/20 rounded-2xl border-dashed">
          <QrCode size={120} className="text-primary mb-6 opacity-80" />
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest text-center">{t('payment.scanToPay', 'Scan to Pay')}</Text>
        </div>
        <div className="space-y-3">
          <Text size="xs" weight="bold" muted className="uppercase tracking-widest">{t('payment.digitalCheckoutUrl', 'Digital Checkout URL')}</Text>
          <div className="flex gap-2">
            <div className="flex-1 p-4 bg-muted/30 rounded-lg border font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
              {paymentLink}
            </div>
            <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 h-12 w-12 border-2">
              {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 font-bold h-12 text-foreground" onClick={onClose}><span className="shrink-0">{t('common.close')}</span></Button>
          <Button variant="primary" className="flex-1 font-bold h-12 gap-2" onClick={() => window.open(paymentLink, '_blank')}>
            <ExternalLink size={18} className="shrink-0" /> <span className="shrink-0">{t('payment.openPreview', 'Open Preview')}</span>
          </Button>
        </div>
      </Stack>
    </Modal>
  );
};

// --- BOOKING DETAIL DRAWER ---
const BookingDetailDrawer: React.FC<{
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ bookingId, isOpen, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const booking = store.getBookings().find(b => b.id === bookingId);
  const [showAudit, setShowAudit] = useState(false);
  
  if (!isOpen || !booking) return null;

  const room = store.getRoomById(booking.roomId);
  const invoice = store.getInvoices().find(i => (i as any).bookingId === booking.id || (i as any).bookingGroupId === booking.id);
  const meals = store.getMealOrders().filter(m => (m as any).bookingId === booking.id || (m as any).bookingGroupId === booking.id);
  
  return (
    <DetailDrawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t('bookings.details.title', 'Booking Details')}
      subtitle={`#${booking.id.slice(0, 8).toUpperCase()}`}
    >
      {/* 1. Summary Block */}
      <section className="space-y-4">
        <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.summary', 'Summary')}</Text>
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
          <div>
            <Text size="xs" muted>{t('common.status', 'Status')}</Text>
            <Badge 
              variant={
                booking.status === BookingStatus.CHECKED_IN ? 'success' : 
                booking.status === BookingStatus.CONFIRMED ? 'default' :
                booking.status === BookingStatus.CHECKED_OUT ? 'secondary' :
                'outline'
              }
              className="mt-1"
            >
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>
          <div>
            <Text size="xs" muted>{t('rooms.unit', 'Unit')}</Text>
            <Text size="sm" weight="medium">{room?.number || 'N/A'}</Text>
          </div>
          <div>
            <Text size="xs" muted>{t('common.customer', 'Customer')}</Text>
            <Text size="sm" weight="medium">{booking.customerName}</Text>
            {booking.companyName && <Text size="xs" muted>{booking.companyName}</Text>}
          </div>
          <div>
            <Text size="xs" muted>{t('common.dates', 'Dates')}</Text>
            <Text size="sm">{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</Text>
          </div>
        </div>
      </section>

      {/* 2. Actions Block */}
      <section className="space-y-4">
        <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.actions', 'Actions')}</Text>
        <div className="flex flex-col gap-2">
          {booking.status === BookingStatus.CONFIRMED && (
            <Button 
              variant="outline" 
              disabled={room?.status === RoomStatus.OUT_OF_SERVICE}
              onClick={() => {
                store.updateBookingStatus(booking.id, BookingStatus.CHECKED_IN);
                onUpdate();
                onClose();
              }}
              className="w-full justify-start h-10"
            >
              {t('bookings.actions.checkIn', 'Check In')}
            </Button>
          )}
          {booking.status === BookingStatus.CHECKED_IN && (
            <Button 
              variant="outline"
              onClick={() => {
                store.updateBookingStatus(booking.id, BookingStatus.CHECKED_OUT);
                onUpdate();
                onClose();
              }}
              className="w-full justify-start h-10"
            >
              {t('bookings.actions.checkOut', 'Check Out')}
            </Button>
          )}
          {booking.status !== BookingStatus.CANCELLED && (
            <Button 
              variant="outline"
              onClick={() => {
                if (confirm(t('bookings.confirmCancel', 'Are you sure you want to cancel this booking?'))) {
                  store.updateBookingStatus(booking.id, BookingStatus.CANCELLED);
                  onUpdate();
                  onClose();
                }
              }}
              className="w-full justify-start h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
          {booking.status === BookingStatus.CHECKED_OUT && !invoice && (
            <Button 
              variant="outline"
              onClick={() => {
                alert('Invoice generation not yet implemented');
                onUpdate();
              }}
              className="w-full justify-start h-10"
            >
              {t('bookings.actions.createInvoice', 'Create Invoice')}
            </Button>
          )}
        </div>
      </section>

      {/* 3. Details Block */}
      <section className="space-y-4">
        <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.details', 'Details')}</Text>
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex justify-between">
            <Text size="sm" muted>{t('bookings.guests', 'Guests')}</Text>
            <Text size="sm">{booking.guestCount}</Text>
          </div>
          <div className="flex justify-between">
            <Text size="sm" muted>{t('payment.method', 'Payment Method')}</Text>
            <Text size="sm">{booking.paymentMethod?.replace('_', ' ') || '-'}</Text>
          </div>
          {booking.totalPrice && (
            <div className="flex justify-between">
              <Text size="sm" muted>{t('common.total', 'Total')}</Text>
              <MoneyValue amount={booking.totalPrice} />
            </div>
          )}
          {booking.internalNotes && (
            <div className="pt-2">
              <Text size="xs" muted className="mb-1">{t('common.notes', 'Notes')}</Text>
              <div className="p-3 bg-muted/20 rounded border border-border text-sm italic">
                {booking.internalNotes}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Related Block */}
      {(meals.length > 0 || invoice) && (
        <section className="space-y-4">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.related', 'Related')}</Text>
          <div className="space-y-2">
            {meals.length > 0 && (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <Utensils size={16} className="text-muted-foreground" />
                  <Text size="sm">{t('kitchen.orders', 'Kitchen Orders')}</Text>
                </div>
                <Badge variant="secondary">{meals.length}</Badge>
              </div>
            )}
            {invoice && (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  <Text size="sm">{t('billing.invoice', 'Invoice')}</Text>
                </div>
                <Badge variant="outline">{invoice.status}</Badge>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Audit Block */}
      <section className="pt-4 border-t border-border">
        <button 
          onClick={() => setShowAudit(!showAudit)}
          className="flex items-center justify-between w-full hover:bg-muted/20 p-2 rounded transition-colors"
        >
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.auditHistory', 'Audit History')}</Text>
          {showAudit ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
        </button>
        {showAudit && (
          <div className="mt-4 space-y-3 pl-2 border-l-2 border-border ml-2">
            <Text size="xs" muted>Status changes and important events only</Text>
            {/* Placeholder for audit logs */}
          </div>
        )}
      </section>
    </DetailDrawer>
  );
};

// --- BOOKING VIEW ---
export const BookingView = ({ 
  autoOpenForm = false, 
  onFormOpened,
  onNewReservationClick 
}: { 
  autoOpenForm?: boolean;
  onFormOpened?: () => void;
  onNewReservationClick?: () => void;
} = {}) => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState(store.getBookings());
  const [showAdd, setShowAdd] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rooms] = useState(store.getRooms());
  const [kitchenItems] = useState(store.getKitchenItems());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus[]>([]);
  const [quickFilter, setQuickFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // FORM STATE aligned with refined spec
  const [form, setForm] = useState<{
    customerType: CustomerType;
    customerName: string;
    companyName: string;
    customerEmail: string;
    customerPhone: string;
    billingAddress: string;
    orgNumber: string;
    reference1: string;
    reference2: string;
    internalNote: string; // Step 1: Identity
    startDate: string;
    endDate: string;
    guestCount: number;
    roomType: RoomType;
    roomId: string;
    checkInTime: string;
    checkOutTime: string; // Step 2: Stay
    bookingMode: 'Individual' | 'Group';
    groupName: string;
    operationalNotes: string; // Step 3: Mode
    rateCode: string;
    pricePerNightOverride: string;
    discountPercentage: string;
    paymentMethod: PaymentMethod;
    cardGuaranteeRequired: boolean;
    cardGuaranteeRef: string; // Step 4: Financials
    meals: Array<Omit<IMealOrder, 'id' | 'bookingId' | 'status'>>;
    extraFees: Array<Omit<IExtraFee, 'id'>>; // Step 5: Orders
  }>({
    customerType: CustomerType.PERSON,
    customerName: '',
    companyName: '',
    customerEmail: '',
    customerPhone: '',
    billingAddress: '',
    orgNumber: '',
    reference1: '',
    reference2: '',
    internalNote: '',
    startDate: '',
    endDate: '',
    guestCount: 1,
    roomType: RoomType.SINGLE,
    roomId: '',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    bookingMode: 'Individual',
    groupName: '',
    operationalNotes: '',
    rateCode: 'Standard',
    pricePerNightOverride: '',
    discountPercentage: '',
    paymentMethod: PaymentMethod.INVOICE,
    cardGuaranteeRequired: false,
    cardGuaranteeRef: '',
    meals: [],
    extraFees: []
  });

  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Auto-open form if prop is set
  useEffect(() => {
    if (autoOpenForm && !showAdd) {
      setShowAdd(true);
      setCurrentStep(0);
      onFormOpened?.();
    }
  }, [autoOpenForm, showAdd, onFormOpened]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (!showFilters) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const container = document.querySelector('.filter-dropdown-container');
      if (container && !container.contains(target)) {
        setShowFilters(false);
      }
    };
    
    // Use a small delay to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = 
        !searchQuery ||
        booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.getRoomById(booking.roomId)?.number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(booking.status);
      
      const matchesDateFrom = !dateFrom || booking.startDate >= dateFrom || booking.endDate >= dateFrom;
      const matchesDateTo = !dateTo || booking.startDate <= dateTo || booking.endDate <= dateTo;
      
      let matchesQuick = true;
      if (quickFilter.length > 0) {
          matchesQuick = quickFilter.some(filter => {
              if (filter === 'ARRIVING') return booking.startDate === todayDate;
              if (filter === 'DEPARTING') return booking.endDate === todayDate;
              if (filter === 'UNPAID') {
                  const inv = store.getInvoices().find(i => (i as any).bookingId === booking.id || i.bookingGroupId === booking.id);
                  return booking.status !== BookingStatus.CANCELLED && (!inv || inv.status !== 'PAID');
              }
              return false;
          });
      }

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesQuick;
    });
  }, [bookings, searchQuery, statusFilter, quickFilter, todayDate, dateFrom, dateTo]);

  const steps = [
    { title: t('bookings.steps.identity'), icon: <UserCircle size={18} /> },
    { title: t('bookings.steps.stay'), icon: <Calendar size={18} /> },
    { title: t('bookings.steps.mode'), icon: <Briefcase size={18} /> },
    { title: t('bookings.steps.financial'), icon: <CreditCard size={18} /> },
    { title: t('bookings.steps.orders'), icon: <Utensils size={18} /> },
    { title: t('bookings.steps.confirm'), icon: <ShieldCheck size={18} /> }
  ];

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => r.type === form.roomType);
  }, [rooms, form.roomType]);

  const availableRooms = useMemo(() => {
    if (!form.startDate || !form.endDate) return [];
    if (new Date(form.startDate) >= new Date(form.endDate)) return [];
    // Use AvailabilityService via store.getAvailableRooms for optimized availability check
    const available = store.getAvailableRooms(form.startDate, form.endDate);
    return filteredRooms.filter(room => available.some(r => r.id === room.id));
  }, [form.startDate, form.endDate, filteredRooms]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to discard this new reservation? All data will be lost.")) {
      setShowAdd(false);
      setCurrentStep(0);
    }
  };

  const handleCreateBooking = () => {
    try {
      if (!form.customerName || !form.roomId || !form.startDate || !form.endDate) {
        alert("Please complete the basic Guest and Stay information.");
        return;
      }
      
      const bookingData: any = {
        ...form,
        internalNotes: form.operationalNotes, // Map to store expectations
        pricePerNightOverride: form.pricePerNightOverride ? parseFloat(form.pricePerNightOverride) : undefined,
        discountPercentage: form.discountPercentage ? parseFloat(form.discountPercentage) : undefined,
        extraFees: form.extraFees.map(f => ({ ...f, id: Math.random().toString(36).substr(2, 9) }))
      };

      store.addBooking(bookingData, form.meals, 'Staff');
      setBookings([...store.getBookings()]);
      setShowAdd(false);
      setCurrentStep(0);
      alert("Reservation successfully locked and audit entry created.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getSubTotal = () => {
    if (!form.roomId || !form.startDate || !form.endDate) return 0;
    const room = rooms.find(r => r.id === form.roomId);
    if (!room) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const base = form.pricePerNightOverride ? parseFloat(form.pricePerNightOverride) : room.pricePerNight;
    let total = diff * base;
    if (form.discountPercentage) {
      total = total * (1 - parseFloat(form.discountPercentage) / 100);
    }
    return total;
  };

  const getAddOnsTotal = () => {
    const mealTotal = form.meals.reduce((sum, m) => {
      const item = kitchenItems.find(k => k.id === m.itemId);
      return sum + (item ? item.price * m.qty : 0);
    }, 0);
    const feeTotal = form.extraFees.reduce((sum, f) => sum + f.amount, 0);
    return mealTotal + feeTotal;
  };

  const totalVAT = useMemo(() => {
    const roomSub = getSubTotal();
    const roomVAT = roomSub * 0.25; // Standard room VAT

    const mealVAT = form.meals.reduce((sum, m) => {
      const item = kitchenItems.find(k => k.id === m.itemId);
      return sum + (item ? (item.price * m.qty * (item.vatCode / 100)) : 0);
    }, 0);

    const feeVAT = form.extraFees.reduce((sum, f) => {
      return sum + (f.amount * (f.vatCode / 100));
    }, 0);

    return roomVAT + mealVAT + feeVAT;
  }, [form.meals, form.extraFees, getSubTotal, kitchenItems]);

  const addMealLine = () => {
    setForm(prev => ({
      ...prev,
      meals: [...prev.meals, { date: prev.startDate || todayDate, type: 'Breakfast', qty: prev.guestCount, itemId: 'k1', servingLocation: 'Dining Room', notes: '' }]
    }));
  };

  const addFeeLine = (description: string, amount: number = 0) => {
    setForm(prev => ({
      ...prev,
      extraFees: [...prev.extraFees, { description, amount, vatCode: 25 }]
    }));
  };

  const isStepValid = useMemo(() => {
    switch(currentStep) {
      case 0: return !!form.customerName && !!form.customerEmail && !!form.customerPhone;
      case 1: return !!form.startDate && !!form.endDate && !!form.roomId;
      default: return true;
    }
  }, [currentStep, form]);

  return (
    <div className="space-y-6 pb-20">
      {/* PAGE HEADER */}
        {!showAdd && (
        <PageHeader 
          title={t('bookings.title')} 
          subtitle={t('bookings.subtitle', 'Overview and handling of all reservations')}
          actions={
          <Button 
            onClick={() => { 
                if (onNewReservationClick) onNewReservationClick();
                else { setShowAdd(true); setCurrentStep(0); }
            }} 
            variant="primary"
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              {t('bookings.newBooking', 'New booking')}
          </Button>
          }
        />
      )}

      {/* FILTER BAR */}
      {!showAdd && (
        <FilterBar 
          primaryFilters={
            <>
              {/* Date Range */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('bookings.from', 'From')}</Text>
                <Input 
                  type="date"
                  size="md"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-36 flex-shrink-0"
                  aria-label={t('bookings.from', 'From date')}
                />
                <Text size="sm" muted className="flex-shrink-0">-</Text>
                <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('bookings.to', 'To')}</Text>
                <Input 
                  type="date"
                  size="md"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-36 flex-shrink-0"
                  aria-label={t('bookings.to', 'To date')}
                />
      </div>
              
              <div className="h-6 w-px bg-border mx-1 hidden sm:block flex-shrink-0" />
              
              {/* Status Filter */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.status', 'Status')}</Text>
                <Select 
                  size="md"
                  value={statusFilter.length === 1 ? statusFilter[0] : ''}
                  onChange={e => setStatusFilter(e.target.value ? [e.target.value as BookingStatus] : [])}
                  className="w-[160px] flex-shrink-0"
                  aria-label={t('bookings.filterByStatus', 'Filter by status')}
                >
                  <option value="">{t('bookings.allStatuses', 'All statuses')}</option>
                  {Object.values(BookingStatus).map(s => (
                    <option key={s} value={s}>
                      {s === BookingStatus.DRAFT ? t('bookings.status.draft', 'Draft') :
                       s === BookingStatus.CONFIRMED ? t('bookings.status.confirmed', 'Confirmed') :
                       s === BookingStatus.CHECKED_IN ? t('bookings.status.checkedIn', 'Checked In') :
                       s === BookingStatus.CHECKED_OUT ? t('bookings.status.checkedOut', 'Checked Out') :
                       s === BookingStatus.CANCELLED ? t('bookings.status.cancelled', 'Cancelled') : String(s).replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          }
          search={
            <div className="relative w-full">
              <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <Input 
                size="md"
                placeholder={t('bookings.searchPlaceholder', 'Search...')} 
                className="pl-10 w-full" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          }
          onClear={(statusFilter.length > 0 || quickFilter.length > 0 || searchQuery || dateFrom || dateTo) ? () => { 
            setStatusFilter([]); setQuickFilter([]); setSearchQuery(''); setDateFrom(''); setDateTo(''); 
          } : undefined}
        />
      )}

      {showAdd && (
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Progress Indicator */}
          <Card className="p-4 border border-border">
            <div className="flex items-center justify-between w-full">
                {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 relative">
                    <div className="relative flex items-center justify-center w-full mb-3">
                      {/* Connector Line */}
                      {idx < steps.length - 1 && (
                      <div className={`absolute top-1/2 left-[60%] right-0 h-[2px] transition-all duration-300 ${currentStep > idx ? 'bg-primary' : 'bg-border'}`} />
                      )}
                      
                    {/* Step Circle */}
                      <button 
                      onClick={() => { if (idx <= currentStep) setCurrentStep(idx); }}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                          currentStep === idx 
                          ? 'bg-primary text-white border-primary' 
                            : currentStep > idx 
                            ? 'bg-emerald-500 text-white border-emerald-500' 
                            : 'bg-white text-muted-foreground border-border'
                        }`}
                      disabled={idx > currentStep}
                      >
                      {currentStep > idx ? <CheckCircle2 size={18} /> : (idx + 1)}
                      </button>
                    </div>
                    <Text 
                      size="xs" 
                      weight={currentStep === idx ? 'bold' : 'medium'} 
                    className={`uppercase tracking-widest text-[10px] text-center transition-colors ${
                      currentStep === idx ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    >
                      {step.title}
                    </Text>
                  </div>
                ))}
             </div>
          </Card>

            {/* Step Content */}
          <div className="space-y-6">
              
              {/* STEP 1: IDENTITY */}
              {currentStep === 0 && (
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <UserCircle size={16} />
                    </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{t('bookings.step1.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('bookings.step1.subtitle')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Entity Type Toggle */}
                  <div className="flex gap-2 bg-muted/30 p-1 rounded-lg border border-border">
                       <Button 
                         variant={form.customerType === CustomerType.PERSON ? 'primary' : 'ghost'} 
                      className="flex-1 h-9 text-sm" 
                         onClick={() => setForm({...form, customerType: CustomerType.PERSON})}
                      aria-pressed={form.customerType === CustomerType.PERSON}
                    >
                      {t('bookings.step1.person')}
                    </Button>
                       <Button 
                         variant={form.customerType === CustomerType.COMPANY ? 'primary' : 'ghost'} 
                      className="flex-1 h-9 text-sm" 
                         onClick={() => setForm({...form, customerType: CustomerType.COMPANY})}
                      aria-pressed={form.customerType === CustomerType.COMPANY}
                    >
                      {t('bookings.step1.company')}
                    </Button>
                    </div>

                  {/* Contact Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="customerName" required>{t('bookings.step1.contactName')}</Label>
                      <Input 
                        id="customerName"
                        size="md"
                        value={form.customerName} 
                        onChange={e => setForm({...form, customerName: e.target.value})} 
                        placeholder={t('bookings.step1.contactNamePlaceholder', 'Full name of contact...')}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="customerEmail" required>{t('bookings.step1.email')}</Label>
                      <Input 
                        id="customerEmail"
                        size="md"
                        type="email"
                        value={form.customerEmail} 
                        onChange={e => setForm({...form, customerEmail: e.target.value})} 
                        placeholder="email@example.com"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="customerPhone" required>{t('bookings.step1.phone')}</Label>
                      <Input 
                        id="customerPhone"
                        size="md"
                        type="tel"
                        value={form.customerPhone} 
                        onChange={e => setForm({...form, customerPhone: e.target.value})} 
                        placeholder="+47 ..."
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="billingAddress" required>{t('bookings.step1.billingAddress')}</Label>
                      <Input 
                        id="billingAddress"
                        size="md"
                        value={form.billingAddress} 
                        onChange={e => setForm({...form, billingAddress: e.target.value})} 
                        placeholder={t('bookings.step1.billingAddressPlaceholder', 'Street, Zip, City...')}
                        className="w-full"
                      />
                    </div>
                    </div>

                  {/* Company Details Section (conditional) */}
                  {form.customerType === CustomerType.COMPANY && (
                    <div className="pt-4 border-t border-border space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">{t('bookings.step1.companyDetails', 'Company Details')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="companyName" required>{t('bookings.step1.companyName')}</Label>
                          <Input 
                            id="companyName"
                            size="md"
                            value={form.companyName} 
                            onChange={e => setForm({...form, companyName: e.target.value})} 
                            placeholder={t('bookings.step1.companyNamePlaceholder', 'Entity name...')}
                            className="w-full"
                          />
                         </div>
                        <div className="space-y-1">
                          <Label htmlFor="orgNumber">{t('bookings.step1.orgNumber')}</Label>
                          <Input 
                            id="orgNumber"
                            size="md"
                            value={form.orgNumber} 
                            onChange={e => setForm({...form, orgNumber: e.target.value})} 
                            placeholder="XXX-XXX-XXX"
                            className="w-full"
                          />
                         </div>
                        <div className="space-y-1">
                          <Label htmlFor="reference1">{t('bookings.step1.reference1')}</Label>
                          <Input 
                            id="reference1"
                            size="md"
                            value={form.reference1} 
                            onChange={e => setForm({...form, reference1: e.target.value})}
                            className="w-full"
                          />
                         </div>
                        <div className="space-y-1">
                          <Label htmlFor="reference2">{t('bookings.step1.reference2')}</Label>
                          <Input 
                            id="reference2"
                            size="md"
                            value={form.reference2} 
                            onChange={e => setForm({...form, reference2: e.target.value})}
                            className="w-full"
                          />
                         </div>
                         </div>
                      </div>
                    )}

                  {/* Internal Note Section */}
                  <div className="pt-4 border-t border-border space-y-1">
                    <Label htmlFor="internalNote">{t('bookings.step1.internalNote')}</Label>
                    <Textarea 
                      id="internalNote"
                      size="md"
                      value={form.internalNote} 
                      onChange={e => setForm({...form, internalNote: e.target.value})} 
                      placeholder={t('bookings.step1.internalNoteHint')}
                      rows={2}
                      className="w-full"
                    />
                  </div>
                  </div>
                </Card>
              )}

              {/* STEP 2: STAY */}
              {currentStep === 1 && (
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Calendar size={16} />
                    </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{t('bookings.step2.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('bookings.step2.subtitle')}</p>
                  </div>
                    </div>
                <div className="space-y-4">
                  {/* Date & Guest Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="startDate" required>{t('bookings.step2.checkIn')}</Label>
                      <Input 
                        id="startDate"
                        size="md"
                        type="date" 
                        value={form.startDate} 
                        onChange={e => setForm({...form, startDate: e.target.value})} 
                        min={todayDate}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endDate" required>{t('bookings.step2.checkOut')}</Label>
                      <Input 
                        id="endDate"
                        size="md"
                        type="date" 
                        value={form.endDate} 
                        onChange={e => setForm({...form, endDate: e.target.value})} 
                        min={form.startDate || todayDate}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="guestCount">{t('bookings.step2.numberOfGuests')}</Label>
                      <Input 
                        id="guestCount"
                        size="md"
                        type="number" 
                        min={1} 
                        value={form.guestCount} 
                        onChange={e => setForm({...form, guestCount: parseInt(e.target.value) || 1})}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="roomType">{t('bookings.step2.roomType')}</Label>
                      <Select 
                        id="roomType"
                        size="md"
                        value={form.roomType} 
                        onChange={e => setForm({...form, roomType: e.target.value as RoomType})}
                        className="w-full"
                      >
                        {Object.values(RoomType).map(rt => {
                          const typeMap: Record<RoomType, string> = {
                            [RoomType.SINGLE]: t('rooms.typeSingle', 'Single'),
                            [RoomType.DOUBLE]: t('rooms.typeDouble', 'Double'),
                            [RoomType.APARTMENT]: t('rooms.typeApartment', 'Apartment')
                          };
                          return <option key={rt} value={rt}>{typeMap[rt] || rt}</option>;
                        })}
                      </Select>
                    </div>
                       </div>
                  
                  {/* Room Selection */}
                  <div className="pt-4 border-t border-border">
                    <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-2">{t('bookings.step2.selectUnit')}</Text>
                    {!form.startDate || !form.endDate ? (
                      <div className="p-6 text-center border border-dashed border-border rounded-lg bg-muted/30">
                        <Text size="sm" muted>{t('bookings.selectDatesFirst', 'Please select check-in and check-out dates first')}</Text>
                    </div>
                    ) : availableRooms.length === 0 ? (
                      <div className="p-6 text-center border border-border rounded-lg bg-muted/30 flex flex-col items-center gap-2">
                        <Ban size={24} className="text-muted-foreground opacity-50" />
                        <Text size="sm" weight="medium" className="text-muted-foreground">
                          {t('bookings.noUnitsAvailable', 'No units available for these dates.')}
                        </Text>
                       </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-3 border border-border rounded-lg bg-muted/20">
                        {availableRooms.map(r => (
                          <button 
                            key={r.id}
                            onClick={() => setForm({...form, roomId: r.id})}
                            className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                              form.roomId === r.id 
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                                : 'border-border bg-white hover:border-primary/50'
                            }`}
                          >
                            <Text weight="black" size="lg">{r.number}</Text>
                            <Badge variant="outline" className="text-[10px]">
                              {(() => {
                                const typeMap: Record<RoomType, string> = {
                                  [RoomType.SINGLE]: t('rooms.typeSingle', 'Single'),
                                  [RoomType.DOUBLE]: t('rooms.typeDouble', 'Double'),
                                  [RoomType.APARTMENT]: t('rooms.typeApartment', 'Apartment')
                                };
                                return typeMap[r.type] || r.type;
                              })()}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  </div>
                </Card>
              )}

            {/* STEP 3: MODE */}
              {currentStep === 2 && (
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Briefcase size={16} />
                    </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{t('bookings.step3.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('bookings.step3.subtitle')}</p>
                  </div>
                    </div>
                <div className="space-y-4">
                  {/* Booking Mode Toggle */}
                  <div className="flex gap-2 bg-muted/30 p-1 rounded-lg border border-border">
                    <Button 
                      variant={form.bookingMode === 'Individual' ? 'primary' : 'ghost'} 
                      className="flex-1 h-9 text-sm" 
                      onClick={() => setForm({...form, bookingMode: 'Individual'})}
                      aria-pressed={form.bookingMode === 'Individual'}
                    >
                      {t('bookings.step3.individual')}
                    </Button>
                    <Button 
                      variant={form.bookingMode === 'Group' ? 'primary' : 'ghost'} 
                      className="flex-1 h-9 text-sm" 
                      onClick={() => setForm({...form, bookingMode: 'Group'})}
                      aria-pressed={form.bookingMode === 'Group'}
                    >
                      {t('bookings.step3.group')}
                    </Button>
                  </div>

                  {/* Group Name (conditional) */}
                    {form.bookingMode === 'Group' && (
                    <div className="space-y-1">
                      <Label htmlFor="groupName">{t('bookings.step3.groupName')}</Label>
                      <Input 
                        id="groupName"
                        size="md"
                        value={form.groupName} 
                        onChange={e => setForm({...form, groupName: e.target.value})} 
                        placeholder={t('bookings.step3.groupNamePlaceholder', 'e.g. Summer Conference 2025')}
                        className="w-full"
                      />
                      </div>
                    )}

                  {/* Operational Notes */}
                  <div className="pt-4 border-t border-border space-y-1">
                    <Label htmlFor="operationalNotes">{t('bookings.step3.operationalNotes')}</Label>
                    <Textarea 
                      id="operationalNotes"
                      size="md"
                      value={form.operationalNotes} 
                      onChange={e => setForm({...form, operationalNotes: e.target.value})} 
                      placeholder={t('bookings.step3.operationalNotesPlaceholder', 'Late arrival, extra keys needed, VIP handling, etc...')}
                      rows={3}
                      className="w-full"
                    />
                    </div>
                  </div>
                </Card>
              )}

            {/* STEP 4: FINANCIAL */}
              {currentStep === 3 && (
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <CreditCard size={16} />
                       </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{t('bookings.step4.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('bookings.step4.subtitle')}</p>
                     </div>
                        </div>
                <div className="space-y-4">
                  {/* Pricing Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="rateCode">{t('bookings.step4.rateCode')}</Label>
                      <Select 
                        id="rateCode"
                        size="md"
                        value={form.rateCode} 
                        onChange={e => setForm({...form, rateCode: e.target.value})}
                        className="w-full"
                      >
                        <option value="Standard">{t('bookings.step4.rateStandard', 'Standard')}</option>
                        <option value="Corporate">{t('bookings.step4.rateCorporate', 'Corporate')}</option>
                        <option value="Seasonal">{t('bookings.step4.rateSeasonal', 'Seasonal Offer')}</option>
                        <option value="Long Stay">{t('bookings.step4.rateLongStay', 'Long Stay')}</option>
                      </Select>
                        </div>
                    <div className="space-y-1">
                      <Label htmlFor="discountPercentage">{t('bookings.step4.discount')}</Label>
                      <Input 
                        id="discountPercentage"
                        size="md"
                        type="number" 
                        min="0"
                        max="100"
                        value={form.discountPercentage} 
                        onChange={e => setForm({...form, discountPercentage: e.target.value})} 
                        placeholder="0"
                        className="w-full"
                      />
                        </div>
                    <div className="space-y-1">
                      <Label htmlFor="pricePerNightOverride">{t('bookings.step4.priceOverride')}</Label>
                      <Input 
                        id="pricePerNightOverride"
                        size="md"
                        type="number" 
                        min="0"
                        value={form.pricePerNightOverride} 
                        onChange={e => setForm({...form, pricePerNightOverride: e.target.value})} 
                        placeholder={t('bookings.step4.priceOverridePlaceholder', 'Standard Rate')}
                        className="w-full"
                      />
                     </div>
                    <div className="space-y-1">
                      <Label htmlFor="paymentMethod">{t('bookings.step4.paymentMethod')}</Label>
                      <Select 
                        id="paymentMethod"
                        size="md"
                        value={form.paymentMethod} 
                        onChange={e => setForm({...form, paymentMethod: e.target.value as PaymentMethod})}
                        className="w-full"
                      >
                        {Object.values(PaymentMethod).map(m => {
                          const methodMap: Record<PaymentMethod, string> = {
                            [PaymentMethod.PREPAYMENT]: t('payment.prepayment', 'Prepayment'),
                            [PaymentMethod.INVOICE]: t('payment.invoice', 'Pay by Invoice'),
                            [PaymentMethod.PAYMENT_LINK]: t('payment.paymentLink', 'Payment Link'),
                            [PaymentMethod.NETS]: t('payment.paymentNETS', 'NETS Terminal')
                          };
                          return <option key={m} value={m}>{methodMap[m] || m}</option>;
                        })}
                      </Select>
                       </div>
                     </div>
                  
                  {/* Price Summary */}
                  <div className="pt-4 border-t border-border p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex justify-between items-center mb-1">
                      <Text size="sm" muted>
                        {t('bookings.step4.baseRate', 'Base Rate')} 
                        {form.endDate && form.startDate && (
                          <span className="ml-1">
                            (x{Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime())/(1000*60*60*24))} {t('bookings.nights')})
                          </span>
                        )}
                      </Text>
                      <MoneyValue amount={getSubTotal()} currency="NOK" className="text-lg font-bold text-right" />
                        </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <Text>{t('bookings.step4.vat', 'VAT')} (25%)</Text>
                      <Text>{t('bookings.step4.included', 'Included')}</Text>
                        </div>
                          </div>
                     </div>
                  </Card>
              )}

              {/* STEP 5: ORDERS */}
              {currentStep === 4 && (
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Utensils size={16} />
                      </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{t('bookings.step5.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('bookings.step5.subtitle')}</p>
                    </div>
                    </div>
                <div className="space-y-4">
                  {/* Meal Plans Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Text weight="bold" size="sm">{t('bookings.step5.mealPlans', 'Meal Plans')}</Text>
                      <Button size="sm" variant="outline" onClick={addMealLine}>
                        <Plus size={14} className="mr-2"/>
                        {t('bookings.step5.addMeal', 'Add meal')}
                      </Button>
                  </div>
                    {form.meals.length === 0 ? (
                      <div className="text-center p-4 border border-dashed border-border rounded-lg bg-muted/20">
                        <Text size="sm" muted>{t('bookings.step5.noMealsAdded', 'No meals added')}</Text>
                         </div>
                    ) : (
                         <div className="space-y-2">
                        {form.meals.map((meal, idx) => (
                          <div key={idx} className="flex gap-2 items-center p-2 bg-muted/30 rounded-lg border border-border">
                            <Input 
                              type="date" 
                              size="sm"
                              className="w-32 bg-white" 
                              value={meal.date} 
                              onChange={e => {
                              const newMeals = [...form.meals];
                              newMeals[idx].date = e.target.value;
                              setForm({...form, meals: newMeals});
                              }}
                              min={form.startDate || todayDate}
                              max={form.endDate || ''}
                            />
                            <Select 
                              size="sm"
                              className="flex-1 bg-white" 
                              value={meal.itemId} 
                              onChange={e => {
                              const newMeals = [...form.meals];
                                newMeals[idx].itemId = e.target.value;
                              setForm({...form, meals: newMeals});
                              }}
                              aria-label={t('bookings.step5.mealItem', 'Meal item')}
                            >
                              {kitchenItems.map(k => (
                                <option key={k.id} value={k.id}>
                                  {k.name} (NOK {k.price})
                                </option>
                              ))}
                            </Select>
                            <Input 
                              type="number" 
                              size="sm"
                              min="1"
                              className="w-20 bg-white" 
                              value={meal.qty} 
                              onChange={e => {
                              const newMeals = [...form.meals];
                                newMeals[idx].qty = parseInt(e.target.value) || 1;
                              setForm({...form, meals: newMeals});
                              }}
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="hover:bg-destructive/10 hover:text-destructive" 
                              onClick={() => setForm({...form, meals: form.meals.filter((_, i) => i !== idx)})}
                            >
                              <Trash2 size={16} />
                            </Button>
                      </div>
                    ))}
                      </div>
                    )}
                  </div>

                  {/* Extra Fees Section */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <Text weight="bold" size="sm">{t('bookings.step5.extraFees', 'Extra Fees')}</Text>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => addFeeLine(t('bookings.step5.serviceFee', 'Service Fee'), 0)}
                      >
                        <Plus size={14} className="mr-2"/>
                        {t('bookings.step5.addFee', 'Add fee')}
                      </Button>
                    </div>
                    {form.extraFees.length === 0 ? (
                      <div className="text-center p-4 border border-dashed border-border rounded-lg bg-muted/20">
                        <Text size="sm" muted>{t('bookings.step5.noExtraFeesAdded', 'No extra fees added')}</Text>
                      </div>
                    ) : (
                      <div className="space-y-2">
                    {form.extraFees.map((fee, idx) => (
                          <div key={idx} className="flex gap-2 items-center p-2 bg-muted/30 rounded-lg border border-border">
                            <Input 
                              size="sm"
                              className="flex-1 bg-white" 
                              value={fee.description} 
                              onChange={e => {
                             const newFees = [...form.extraFees];
                             newFees[idx].description = e.target.value;
                             setForm({...form, extraFees: newFees});
                              }} 
                              placeholder={t('bookings.step5.description', 'Description')}
                            />
                            <Input 
                              type="number" 
                              size="sm"
                              min="0"
                              className="w-32 bg-white" 
                              value={fee.amount} 
                              onChange={e => {
                              const newFees = [...form.extraFees];
                                newFees[idx].amount = parseFloat(e.target.value) || 0;
                              setForm({...form, extraFees: newFees});
                              }} 
                              placeholder={t('bookings.step5.amount', 'Amount')}
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="hover:bg-destructive/10 hover:text-destructive" 
                              onClick={() => setForm({...form, extraFees: form.extraFees.filter((_, i) => i !== idx)})}
                            >
                              <Trash2 size={16} />
                            </Button>
                      </div>
                    ))}
                      </div>
                    )}
                  </div>
                </div>
                </Card>
              )}

              {/* STEP 6: CONFIRM */}
              {currentStep === 5 && (
              <Card className="p-4 border border-border">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <ShieldCheck size={16} />
                    </div>
                        <div>
                    <h2 className="text-lg font-bold text-foreground">{t('bookings.step6.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('bookings.step6.subtitle')}</p>
                          </div>
                        </div>
                
                <div className="space-y-4">
                  {/* Booking Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="space-y-1">
                      <Text size="xs" weight="bold" muted className="uppercase tracking-widest">{t('bookings.step6.customer')}</Text>
                      <Text size="base" weight="bold" className="text-slate-900">{form.customerName}</Text>
                      <Text size="sm" muted>{form.customerEmail}</Text>
                      {form.customerPhone && (
                        <Text size="sm" muted>{form.customerPhone}</Text>
                      )}
                          </div>
                    <div className="space-y-1">
                      <Text size="xs" weight="bold" muted className="uppercase tracking-widest">{t('bookings.step6.stay')}</Text>
                      <Text size="base" weight="bold" className="text-slate-900">
                        {form.startDate} <span className="opacity-40 px-2">→</span> {form.endDate}
                      </Text>
                      <Text size="sm" muted>
                        {t('rooms.unit', 'Unit')} {store.getRoomById(form.roomId)?.number} • {
                          (() => {
                            const typeMap: Record<RoomType, string> = {
                              [RoomType.SINGLE]: t('rooms.typeSingle', 'Single'),
                              [RoomType.DOUBLE]: t('rooms.typeDouble', 'Double'),
                              [RoomType.APARTMENT]: t('rooms.typeApartment', 'Apartment')
                            };
                            return typeMap[form.roomType] || form.roomType;
                          })()
                        }
                      </Text>
                    </div>
                    <div className="space-y-1">
                      <Text size="xs" weight="bold" muted className="uppercase tracking-widest">{t('bookings.step6.financials')}</Text>
                      <Text size="sm" weight="bold">
                        {(() => {
                          const methodMap: Record<PaymentMethod, string> = {
                            [PaymentMethod.PREPAYMENT]: t('payment.prepayment', 'Prepayment'),
                            [PaymentMethod.INVOICE]: t('payment.invoice', 'Pay by Invoice'),
                            [PaymentMethod.PAYMENT_LINK]: t('payment.paymentLink', 'Payment Link'),
                            [PaymentMethod.NETS]: t('payment.paymentNETS', 'NETS Terminal')
                          };
                          return methodMap[form.paymentMethod] || form.paymentMethod;
                        })()} • {form.rateCode}
                      </Text>
                    </div>
                    <div className="space-y-1">
                      <Text size="xs" weight="bold" muted className="uppercase tracking-widest">{t('bookings.step6.notes', 'Notes')}</Text>
                      <Text size="sm" className="italic opacity-70">
                        "{form.operationalNotes || t('common.none', 'None')}"
                      </Text>
                        </div>
                     </div>
                     
                  {/* Total & Confirm */}
                  <div className="p-4 bg-slate-900 text-white rounded-lg border border-border">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <Text size="sm" className="opacity-60 uppercase tracking-widest font-bold mb-1">
                          {t('bookings.step6.totalEstimatedCost', 'Total Estimated Cost')}
                        </Text>
                        <MoneyValue amount={getSubTotal() + getAddOnsTotal()} currency="NOK" className="text-2xl font-black tracking-tight" />
                        <Text size="xs" className="opacity-40 mt-1">
                          {t('bookings.step6.includesVat', 'Includes VAT and all added fees')}
                        </Text>
                     </div>
                      <Button 
                        size="lg" 
                        variant="primary" 
                        className="w-full md:w-auto h-14 px-8 text-base font-bold bg-white text-slate-900 hover:bg-emerald-50" 
                        onClick={handleCreateBooking}
                      >
                        <CheckCircle2 className="mr-2" size={20} />
                        {t('bookings.step6.confirmBooking', 'Confirm Booking')}
                      </Button>
                    </div>
                  </div>
                </div>
                </Card>
              )}

            {/* Navigation Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
                   <Button 
                     variant="ghost" 
                onClick={currentStep === 0 ? handleCancel : handleBack} 
                className="h-11 px-6"
                   >
                {currentStep === 0 ? t('common.cancel') : t('common.back')}
                   </Button>
              
              {currentStep < 5 && (
                   <Button 
                  variant="primary" 
                      onClick={handleNext} 
                      disabled={!isStepValid}
                  className="h-11 px-8 font-bold"
                   >
                  {t('bookings.nextStep', 'Next Step')} 
                  <ArrowRight size={18} className="ml-2" />
                   </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOOKINGS LIST */}
      {!showAdd && (
        <DataTable
          headers={[
            t('common.id', 'ID'),
            t('common.customer', 'Customer'),
            t('rooms.unit', 'Unit'),
            t('common.dates', 'Dates'),
            t('common.status', 'Status'),
            t('common.actions', 'Action')
          ]}
          isEmpty={filteredBookings.length === 0}
          emptyMessage={t('bookings.noBookingsMatch', 'No bookings match the selected filters.')}
        >
          {filteredBookings.map(b => {
            const room = store.getRoomById(b.roomId);
            return (
              <tr 
                key={b.id} 
                className="hover:bg-muted/20 transition-colors cursor-pointer group"
                onClick={() => setSelectedBookingId(b.id)}
              >
                <td className="px-4 py-3 font-mono text-sm text-muted-foreground">#{b.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <div>
                    <Text size="sm" weight="medium">{b.customerName}</Text>
                    {b.companyName && <Text size="xs" muted>{b.companyName}</Text>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Text size="sm">{room?.number || 'N/A'}</Text>
                </td>
                <td className="px-4 py-3">
                  <Text size="sm">{b.startDate} - {b.endDate}</Text>
                </td>
                <td className="px-4 py-3">
                  <Badge 
                    variant={
                      b.status === BookingStatus.CHECKED_IN ? 'success' : 
                      b.status === BookingStatus.CONFIRMED ? 'default' :
                      b.status === BookingStatus.CHECKED_OUT ? 'secondary' :
                      'outline'
                    }
                    className="text-xs"
                  >
                    {b.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                   <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBookingId(b.id);
                    }}
                    className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t('common.view', 'View')}
                   </Button>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      {/* BOOKING DETAILS DRAWER */}
      <BookingDetailDrawer
        bookingId={selectedBookingId || ''}
        isOpen={!!selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onUpdate={() => setBookings([...store.getBookings()])}
      />
              </div>
  );
};

// ============================================================================
// ROOMS VIEW COMPONENTS
// ============================================================================

// --- ROOM DETAIL DRAWER ---
const RoomDetailDrawer: React.FC<{
  roomId: string;
  userRole: string;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ roomId, userRole, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ reason: BlockReason.MAINTENANCE, note: '', expectedReturnAt: '' });
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 7);

    // Fetch detail
    fetchRoomDetail(roomId, {
      from: today.toISOString(),
      to: toDate.toISOString(),
    }).then(data => {
      if (!cancelled) {
        setRoom(data);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (!cancelled) setLoading(false);
    });

    // Fetch audit logs
    const logs = store.getAuditLogs().filter(l => l.entityType === AuditEntityType.ROOM && l.entityId === roomId);
    setAuditLogs(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20));

    return () => { cancelled = true; };
  }, [roomId]);

  if (!room && loading) return <DetailDrawer isOpen={true} onClose={onClose} title={t('common.loading')} ><Loader2 className="animate-spin" /></DetailDrawer>;
  if (!room) return null;

  const canEdit = ['ADMIN', 'HOUSEKEEPING', 'MAINTENANCE'].includes(userRole);
  const canBlock = ['ADMIN', 'MAINTENANCE'].includes(userRole);
  const isBlocked = room.status === RoomStatus.OUT_OF_SERVICE;

  const handleStatusChange = async (status: RoomStatus) => {
    try {
      await store.updateRoomStatus(roomId, status, userRole);
      onUpdate();
      // Refetch locally
      const updated = await fetchRoomDetail(roomId);
      setRoom(updated);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBlock = async () => {
    try {
      store.blockUnit(roomId, {
        reason: blockForm.reason,
        note: blockForm.note,
        expectedReturnAt: blockForm.expectedReturnAt
      }, userRole);
      setShowBlockModal(false);
      onUpdate();
      const updated = await fetchRoomDetail(roomId);
      setRoom(updated);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestore = async () => {
    if (confirm(t('rooms.confirmRestore', 'Are you sure you want to restore this unit? It will be marked as DIRTY.'))) {
      try {
        store.restoreUnit(roomId, userRole);
        onUpdate();
        const updated = await fetchRoomDetail(roomId);
        setRoom(updated);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  return (
    <>
      <DetailDrawer
        isOpen={true}
        onClose={onClose}
        title={`${t('rooms.room')} ${room.number}`}
        subtitle={room.type}
        actions={
          <div className="flex gap-2">
            <Badge variant={
              room.status === RoomStatus.CLEAN ? 'success' : 
              room.status === RoomStatus.DIRTY ? 'warning' : 'destructive'
            }>
              {room.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">
              {room.occupancyState}
            </Badge>
                    </div>
        }
      >
        {/* A) Summary */}
        <section className="space-y-4">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.summary', 'Summary')}</Text>
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-2">
            <div className="flex justify-between">
              <Text size="sm" muted>{t('rooms.condition', 'Condition')}</Text>
              <Text size="sm" weight="medium">{room.status.replace('_', ' ')}</Text>
                    </div>
            <div className="flex justify-between">
              <Text size="sm" muted>{t('rooms.occupancy', 'Occupancy')}</Text>
              <Text size="sm" weight="medium">{room.occupancyState}</Text>
                    </div>
            {room.status === RoomStatus.OUT_OF_SERVICE && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-sm mt-2">
                <strong>{t('rooms.blocked', 'Blocked')}:</strong> {room.outOfServiceReason}
                {room.outOfServiceNote && <div className="text-xs mt-1 opacity-80">{room.outOfServiceNote}</div>}
              </div>
            )}
          </div>
        </section>

        {/* B) Outlook (Compact Timeline) */}
        <section className="space-y-4">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('rooms.outlook7Days', 'Outlook (7 Days)')}</Text>
          <div className="space-y-2">
            {room.outlook?.slice(0, 7).map((day: any) => (
              <div key={day.date} className="flex items-center gap-3 text-sm p-2 border border-border rounded-md">
                <div className="w-24 font-mono text-muted-foreground">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</div>
                <div className="flex-1">
                  {day.reservations.length > 0 ? (
                    day.reservations.map((res: any) => (
                      <Badge key={res.id} variant="outline" className="mr-1 bg-blue-50 text-blue-700 border-blue-200">
                        {res.status}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground opacity-50">{t('rooms.free', 'Free')}</span>
                  )}
                      </div>
                    </div>
            ))}
          </div>
        </section>

        {/* D) Housekeeping */}
        <section className="space-y-4">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('housekeeping.title', 'Housekeeping')}</Text>
          <div className="p-4 border border-border rounded-lg">
            {isBlocked ? (
              <Text size="sm" muted className="italic">{t('rooms.housekeepingDisabled', 'Housekeeping actions disabled while Out of Service.')}</Text>
            ) : (
              <div className="flex gap-2">
                {room.status === RoomStatus.DIRTY && (
                  <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => handleStatusChange(RoomStatus.CLEAN)}>
                    <CheckCircle2 size={16} className="mr-2" />
                    {t('rooms.markClean', 'Mark Clean')}
                  </Button>
                )}
                {room.status === RoomStatus.CLEAN && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleStatusChange(RoomStatus.DIRTY)}>
                    <History size={16} className="mr-2" />
                    {t('rooms.markDirty', 'Mark Dirty')}
                  </Button>
                )}
                      </div>
                    )}
          </div>
        </section>

        {/* E) Maintenance & Blocking */}
        <section className="space-y-4">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('maintenance.title', 'Maintenance')}</Text>
          <div className="flex flex-col gap-2">
            {/* OOS Actions */}
            {canBlock && (
              <>
                {!isBlocked ? (
                  <Button variant="destructive" size="sm" onClick={() => setShowBlockModal(true)}>
                    <Ban size={16} className="mr-2" />
                    {t('rooms.setOutOfService', 'Set Out of Service')}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleRestore}>
                    <CheckCircle2 size={16} className="mr-2" />
                    {t('rooms.restoreUnit', 'Restore Unit')}
                  </Button>
                )}
              </>
            )}
            
            <Button variant="outline" size="sm">
              <Plus size={16} className="mr-2" />
              {t('maintenance.createTicket', 'Create Ticket')}
            </Button>
                    </div>
        </section>

        {/* F) Audit Trail */}
        <details className="space-y-4 group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between py-2">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('common.auditTrail', 'Audit Trail')}</Text>
              <ChevronDown size={16} className="transform group-open:rotate-180 transition-transform text-muted-foreground" />
            </div>
          </summary>
          <div className="space-y-2 pl-2 border-l-2 border-border ml-1 mt-2">
            {auditLogs.map(log => (
              <div key={log.id} className="text-xs">
                <div className="flex justify-between text-muted-foreground mb-0.5">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span>{log.userId}</span>
          </div>
                <div className="font-medium">{log.action}</div>
                {log.details && <div className="text-muted-foreground opacity-80 truncate">{log.details}</div>}
        </div>
            ))}
            {auditLogs.length === 0 && <Text size="xs" muted>{t('common.noLogs', 'No recent logs')}</Text>}
          </div>
        </details>
      </DetailDrawer>

      {/* Block Modal */}
      {showBlockModal && (
        <Modal isOpen={true} onClose={() => setShowBlockModal(false)} title={t('rooms.setOutOfService')}>
          <div className="space-y-4 p-1">
            <div>
              <Label required>{t('common.reason')}</Label>
              <Select 
                value={blockForm.reason} 
                onChange={e => setBlockForm({...blockForm, reason: e.target.value as BlockReason})}
              >
                {Object.values(BlockReason).map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <Label>{t('common.note')}</Label>
              <Textarea 
                value={blockForm.note} 
                onChange={e => setBlockForm({...blockForm, note: e.target.value})}
                placeholder={t('rooms.oosNotePlaceholder', 'Describe why...')}
              />
            </div>
            <div>
              <Label>{t('rooms.expectedReturn', 'Expected Return')}</Label>
              <Input 
                type="date" 
                value={blockForm.expectedReturnAt} 
                onChange={e => setBlockForm({...blockForm, expectedReturnAt: e.target.value})}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setShowBlockModal(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" className="flex-1" onClick={handleBlock}>{t('common.confirm')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// --- ROOMS VIEW ---
export const RoomsView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [summaries, setSummaries] = useState<IRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '' as RoomStatus | '',
    type: '' as RoomType | '',
    occupancy: '' as RoomOccupancy | '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const currentRole = userRole || 'VIEWER';
  const isAdmin = currentRole === 'ADMIN';

  // Fetch room summaries
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    const today = new Date(filters.date);
    today.setHours(0, 0, 0, 0);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 7);

    fetchRoomSummaries({
      from: today.toISOString(),
      to: toDate.toISOString(),
      status: filters.status || undefined,
      type: filters.type || undefined,
      q: filters.search || undefined
    }).then((response: any) => {
      if (!cancelled) {
        const mapped = response.rooms.map((r: any) => ({
          id: r.id,
          number: r.number,
          type: r.type,
          status: r.status,
          occupancy: r.occupancyState,
          nextEvent: r.nextEventText || 'No upcoming events',
          blocked: r.blocked,
          hasMaintenance: r.hasOpenMaintenance,
          hasHousekeeping: r.hasHousekeepingDue
        }));
        
        // Client-side filtering for occupancy
        let final = mapped;
        if (filters.occupancy) {
          final = final.filter((r: any) => r.occupancy === filters.occupancy);
        }
        
        setSummaries(final);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Failed to fetch room summaries:', err);
      if (!cancelled) {
        setSummaries(store.getRoomSummaries());
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [tick, filters]);

  const conditionColor = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.CLEAN: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case RoomStatus.DIRTY: return 'bg-amber-100 text-amber-800 border-amber-200';
      case RoomStatus.OUT_OF_SERVICE: return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const occupancyColor = (occ: RoomOccupancy) => {
    switch (occ) {
      case RoomOccupancy.FREE: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case RoomOccupancy.OCCUPIED: return 'bg-blue-50 text-blue-700 border-blue-100';
      case RoomOccupancy.RESERVED: return 'bg-purple-50 text-purple-700 border-purple-100';
      case RoomOccupancy.DEPARTING: return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const filteredRooms = useMemo(() => {
    return summaries.filter(room => {
      const matchesSearch = !filters.search || room.number.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = !filters.status || room.status === filters.status;
      const matchesType = !filters.type || room.type === filters.type;
      const matchesOccupancy = !filters.occupancy || room.occupancy === filters.occupancy;
      return matchesSearch && matchesStatus && matchesType && matchesOccupancy;
    });
  }, [summaries, filters]);

  if (loading && summaries.length === 0) {
    return (
      <div className="space-y-6 pb-20">
        <PageHeader 
          title={t('rooms.title', 'Rooms')}
          subtitle={t('rooms.subtitle', 'Room availability and operational status')}
        />
        <div className="flex items-center justify-center p-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <Text size="sm" muted>{t('rooms.loading', 'Loading rooms...')}</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* PAGE HEADER */}
      <PageHeader 
        title={t('rooms.title', 'Rooms')}
        subtitle={t('rooms.subtitle', 'Room availability and operational status')}
        actions={isAdmin && (
          <Button variant="primary" size="sm" className="flex items-center gap-2">
            <Plus size={16} />
            {t('rooms.addRoom', 'Add Room')}
          </Button>
        )}
      />

      {/* FILTER BAR */}
      <FilterBar
        primaryFilters={
          <>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.date', 'Date')}</Text>
                <Input 
                type="date"
                size="md"
                value={filters.date} 
                onChange={e => setFilters({...filters, date: e.target.value})}
                className="w-36 flex-shrink-0"
                aria-label={t('common.date', 'Date')}
                />
              </div>
            
            <div className="h-6 w-px bg-border mx-1 hidden sm:block flex-shrink-0" />
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('rooms.condition', 'Condition')}</Text>
              <Select 
                size="md"
                value={filters.status} 
                onChange={e => setFilters({...filters, status: e.target.value as RoomStatus})}
                className="w-[140px] flex-shrink-0"
                aria-label={t('rooms.condition', 'Condition')}
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.values(RoomStatus).map(s => (
                  <option key={s} value={s}>
                    {s === RoomStatus.CLEAN ? t('rooms.clean', 'CLEAN') :
                     s === RoomStatus.DIRTY ? t('rooms.dirty', 'DIRTY') :
                     s === RoomStatus.OUT_OF_SERVICE ? t('rooms.outOfService', 'OUT OF SERVICE') :
                     s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('rooms.occupancy', 'Occupancy')}</Text>
              <Select 
                size="md"
                value={filters.occupancy} 
                onChange={e => setFilters({...filters, occupancy: e.target.value as RoomOccupancy})}
                className="w-[140px] flex-shrink-0"
                aria-label={t('rooms.occupancy', 'Occupancy')}
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.values(RoomOccupancy).map(o => (
                  <option key={o} value={o}>
                    {o === RoomOccupancy.FREE ? t('rooms.free', 'FREE') :
                     o === RoomOccupancy.RESERVED ? t('rooms.reserved', 'RESERVED') :
                     o === RoomOccupancy.OCCUPIED ? t('rooms.occupied', 'OCCUPIED') :
                     o === RoomOccupancy.DEPARTING ? t('rooms.departing', 'DEPARTING') :
                     o}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('rooms.type', 'Type')}</Text>
              <Select 
                size="md"
                value={filters.type} 
                onChange={e => setFilters({...filters, type: e.target.value as RoomType})}
                className="w-[140px] flex-shrink-0"
                aria-label={t('rooms.type', 'Type')}
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.values(RoomType).map(type => (
                  <option key={type} value={type}>
                    {type === RoomType.SINGLE ? t('rooms.typeSingle', 'Single') :
                     type === RoomType.DOUBLE ? t('rooms.typeDouble', 'Double') :
                     type === RoomType.APARTMENT ? t('rooms.typeApartment', 'Apartment') :
                     type}
                  </option>
                ))}
              </Select>
            </div>
          </>
        }
        search={
          <div className="relative w-full">
            <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <Input 
              size="md"
              placeholder={t('rooms.searchUnit', 'Search room number...')}
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              className="pl-10 w-full"
                />
              </div>
        }
        onClear={(filters.status || filters.type || filters.occupancy || filters.search) ? () => {
          setFilters({...filters, status: '', type: '', occupancy: '', search: ''});
        } : undefined}
      />

      {/* ROOMS TABLE */}
      <DataTable
        headers={[
          t('rooms.room', 'Room'),
          t('rooms.type', 'Type'),
          t('rooms.condition', 'Condition'),
          t('rooms.occupancy', 'Occupancy'),
          t('rooms.nextEvent', 'Next Event'),
          t('common.actions', 'Actions')
        ]}
        isEmpty={filteredRooms.length === 0}
        emptyMessage={t('rooms.noRoomsMatch', 'No rooms match the selected filters.')}
      >
        {filteredRooms.map(room => (
          <tr 
            key={room.id} 
            className="hover:bg-muted/20 transition-colors cursor-pointer group"
            onClick={() => setSelectedRoomId(room.id)}
          >
            <td className="px-4 py-3">
              <Text weight="bold" size="base">{room.number}</Text>
            </td>
            <td className="px-4 py-3">
              <Text size="sm" muted>{room.type}</Text>
            </td>
            <td className="px-4 py-3">
              <Badge variant="outline" className={`text-[10px] ${conditionColor(room.status)}`}>
                {room.status.replace('_', ' ')}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <Badge variant="outline" className={`text-[10px] ${occupancyColor(room.occupancy as RoomOccupancy)}`}>
                {room.occupancy}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <Text size="sm" muted>{room.nextEvent}</Text>
            </td>
            <td className="px-4 py-3 text-right">
                  <Button
                variant="ghost" 
                    size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRoomId(room.id);
                }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {t('common.view', 'View')}
                  </Button>
            </td>
          </tr>
        ))}
      </DataTable>

      {/* ROOM DETAIL DRAWER */}
      {selectedRoomId && (
        <RoomDetailDrawer
          roomId={selectedRoomId}
          userRole={currentRole}
          onClose={() => setSelectedRoomId(null)}
          onUpdate={() => setTick(t => t + 1)}
        />
      )}
              </div>
  );
};

// --- INVOICE DETAIL DRAWER ---
const InvoiceDetailDrawer: React.FC<{
  invoiceId: string;
  userRole: string;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ invoiceId, userRole, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState(store.getInvoiceById(invoiceId));
  const [lines, setLines] = useState(store.getInvoiceLines(invoiceId));
  const [payments, setPayments] = useState(store.getPaymentsByInvoice(invoiceId));
  const [exports, setExports] = useState(store.getAccountingExportsByInvoice(invoiceId));
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showNetsModal, setShowNetsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    const updated = store.getInvoiceById(invoiceId);
    if (updated) setInvoice(updated);
    setLines(store.getInvoiceLines(invoiceId));
    setPayments(store.getPaymentsByInvoice(invoiceId));
    setExports(store.getAccountingExportsByInvoice(invoiceId));
  }, [invoiceId]);
  
  if (!invoice) return null;
  
  const canEdit = ['ADMIN', 'FINANCE'].includes(userRole);
  const canExport = ['ADMIN', 'FINANCE'].includes(userRole);
  const canCreatePayment = ['ADMIN', 'FINANCE', 'BOOKING_STAFF'].includes(userRole);
  const latestExport = exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  
  const handleSend = async () => {
    try {
      store.sendInvoice(invoice.id, userRole);
      setInvoice(store.getInvoiceById(invoiceId));
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleMarkPaid = async () => {
    try {
      store.markInvoicePaid(invoice.id, userRole);
      setInvoice(store.getInvoiceById(invoiceId));
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleVoid = async () => {
    if (!window.confirm(t('billing.confirmVoid', 'Are you sure you want to void this invoice?'))) return;
    try {
      store.voidInvoice(invoice.id, userRole);
      setInvoice(store.getInvoiceById(invoiceId));
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleCreatePaymentLink = async () => {
    try {
      const payment = await store.createPaymentLink(invoice.id, userRole);
      setPayments(store.getPaymentsByInvoice(invoiceId));
      setInvoice(store.getInvoiceById(invoiceId));
      setShowPaymentLinkModal(true);
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleInitiateNets = async () => {
    try {
      const payment = await store.initiateNetsTerminal(invoice.id, userRole);
      setPayments(store.getPaymentsByInvoice(invoiceId));
      setShowNetsModal(true);
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleExportToVisma = async () => {
    setIsExporting(true);
    try {
      await store.exportToVisma(invoice.id, userRole);
      setExports(store.getAccountingExportsByInvoice(invoiceId));
      setTimeout(() => {
        setExports(store.getAccountingExportsByInvoice(invoiceId));
        setIsExporting(false);
      }, 2000);
      onUpdate();
    } catch (err: any) {
      alert(err.message);
      setIsExporting(false);
    }
  };
  
  const handleRetryExport = async () => {
    if (!latestExport) return;
    setIsExporting(true);
    try {
      await store.retryVismaExport(latestExport.id, userRole);
      setExports(store.getAccountingExportsByInvoice(invoiceId));
      setTimeout(() => {
        setExports(store.getAccountingExportsByInvoice(invoiceId));
        setIsExporting(false);
      }, 2000);
      onUpdate();
    } catch (err: any) {
      alert(err.message);
      setIsExporting(false);
    }
  };
  
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT: return 'bg-slate-100 text-slate-700';
      case InvoiceStatus.SENT: return 'bg-blue-100 text-blue-700';
      case InvoiceStatus.PAID: return 'bg-emerald-100 text-emerald-700';
      case InvoiceStatus.VOID: return 'bg-rose-100 text-rose-700';
    }
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[700px] bg-card border-l border-border shadow-2xl z-50 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Invoice Header Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <div className="space-y-1">
                <Text size="sm" weight="bold" className="text-slate-400 font-mono">{invoice.id}</Text>
                <Text size="xl" weight="bold" className="text-slate-900">{invoice.customerName}</Text>
            </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={20} />
              </Button>
              </div>
            
            {/* Status & Dates */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
              {invoice.issuedAt && (
                <Text size="xs" muted>Issued: {new Date(invoice.issuedAt).toLocaleDateString()}</Text>
              )}
              {invoice.dueDate && (
                <Text size="xs" muted>Due: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
              )}
            </div>
            
            {/* References */}
            <div className="p-3 bg-muted/30 rounded-lg border-2 border-border">
              <Text size="sm" weight="bold" className="mb-2">{t('billing.references', 'References')}</Text>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Text size="xs" muted>Reference 1:</Text>
                  <Text size="xs" weight="medium" className="text-right">{invoice.reference1 || '-'}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="xs" muted>Reference 2:</Text>
                  <Text size="xs" weight="medium" className="text-right">{invoice.reference2 || '-'}</Text>
                </div>
              </div>
            </div>
          </div>
          
          {/* Line Items Section */}
          <div className="space-y-3">
            <Text size="sm" weight="bold">{t('billing.lineItems', 'Line Items')}</Text>
            <div className="space-y-1">
              {lines.map(line => (
                <div key={line.id} className="p-2 border-2 border-border rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <Text size="sm" weight="medium" className="flex-1">{line.description}</Text>
                    <Text size="sm" weight="bold" className="text-right ml-3">{invoice.currency} {line.lineTotal.toLocaleString()}</Text>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>Qty: {line.quantity}</span>
                    <span>Price: {line.unitPrice.toLocaleString()}</span>
                    <span>VAT: {line.vatCode}</span>
                    <span className="ml-auto">VAT: {line.vatAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Totals & VAT Summary Section */}
          <div className="p-3 bg-muted/30 rounded-lg border-2 border-border space-y-2">
            <div className="flex justify-between">
              <Text size="sm" muted>Subtotal:</Text>
              <Text size="sm" weight="medium" className="text-right">{invoice.currency} {invoice.subtotal.toLocaleString()}</Text>
            </div>
            <div className="flex justify-between">
              <Text size="sm" muted>VAT Total:</Text>
              <Text size="sm" weight="medium" className="text-right">{invoice.currency} {invoice.vatTotal.toLocaleString()}</Text>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-border">
              <Text size="lg" weight="bold">Total:</Text>
              <Text size="lg" weight="bold" className="text-right">{invoice.currency} {invoice.total.toLocaleString()}</Text>
            </div>
          </div>
          
          {/* Payment & Export Status Section */}
          <div className="space-y-3">
            <div className="p-3 border-2 border-border rounded-lg">
              <Text size="sm" weight="bold" className="mb-2">{t('billing.payments', 'Payments')}</Text>
              
              {payments.length === 0 ? (
                <Text size="xs" muted>{t('billing.noPayments', 'No payments')}</Text>
              ) : (
                <div className="space-y-1 mb-2">
                  {payments.map(payment => (
                    <div key={payment.id} className="p-2 bg-muted/30 rounded border-2 border-border">
                      <div className="flex justify-between items-center">
                        <Text size="xs" weight="medium">{payment.method} - {payment.status}</Text>
                        <Text size="xs" weight="bold" className="text-right">{payment.currency} {payment.amount.toLocaleString()}</Text>
                      </div>
                      {payment.externalRef && (
                        <Text size="xs" muted className="mt-1 break-all">{payment.externalRef}</Text>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {canCreatePayment && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCreatePaymentLink}>
                    <LinkIcon size={14} className="mr-1" />
                    {t('billing.createPaymentLink', 'Payment Link')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleInitiateNets}>
                    <CreditCard size={14} className="mr-1" />
                    {t('billing.netsTerminal', 'NETS Terminal')}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="p-3 border-2 border-border rounded-lg">
              <Text size="sm" weight="bold" className="mb-2">{t('billing.vismaExport', 'Visma Export')}</Text>
              
              {latestExport ? (
                <div className="space-y-1 mb-2">
                  <div className="p-2 bg-muted/30 rounded border-2 border-border">
                    <div className="flex justify-between items-center">
                      <Text size="xs" weight="medium">Status: {latestExport.status}</Text>
                      {latestExport.status === AccountingExportStatus.FAILED && (
                        <Button variant="outline" size="sm" onClick={handleRetryExport} disabled={isExporting}>
                          {t('billing.retry', 'Retry')}
                        </Button>
                      )}
                    </div>
                    {latestExport.lastError && (
                      <Text size="xs" className="text-rose-600 mt-1">{latestExport.lastError}</Text>
                    )}
                    {latestExport.externalRef && (
                      <Text size="xs" muted className="mt-1">Ref: {latestExport.externalRef}</Text>
                    )}
                  </div>
                </div>
              ) : (
                <Text size="xs" muted className="mb-2">{t('billing.notExported', 'Not exported')}</Text>
              )}
              
              {canExport && invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.VOID && (
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleExportToVisma}
                  disabled={isExporting || latestExport?.status === AccountingExportStatus.PENDING}
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      {t('billing.exporting', 'Exporting...')}
                    </>
                  ) : (
                    <>
                      <Download size={14} className="mr-1" />
                      {t('billing.exportToVisma', 'Export to Visma')}
                    </>
                  )}
                </Button>
              )}
                            </div>
          </div>
          
          {/* Actions */}
          {canEdit && (
            <div className="space-y-2 pt-3 border-t-2 border-border">
              {invoice.status === InvoiceStatus.DRAFT && (
                <Button variant="primary" className="w-full" onClick={handleSend}>
                  {t('billing.sendInvoice', 'Send Invoice')}
                </Button>
              )}
              {invoice.status === InvoiceStatus.SENT && (
                <Button variant="primary" className="w-full" onClick={handleMarkPaid}>
                  {t('billing.markPaid', 'Mark as Paid')}
                </Button>
              )}
              {invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID && (
                <Button variant="destructive" className="w-full" onClick={handleVoid}>
                  {t('billing.voidInvoice', 'Void Invoice')}
                </Button>
              )}
            </div>
          )}
          
          {/* Metadata */}
          <div className="pt-3 border-t-2 border-border space-y-1">
            <Text size="xs" muted>
              {t('billing.createdBy', 'Created by')}: {invoice.createdByUserId}
                              </Text>
            <Text size="xs" muted>
              {t('billing.createdAt', 'Created')}: {new Date(invoice.createdAt).toLocaleString()}
                                </Text>
            <Text size="xs" muted>
              {t('billing.updatedAt', 'Updated')}: {new Date(invoice.updatedAt).toLocaleString()}
                              </Text>
                          </div>
                            </div>
                            </div>
      
      {/* Payment Link Modal */}
      {showPaymentLinkModal && payments.length > 0 && (
        <PaymentLinkModal 
          payment={payments[payments.length - 1]} 
          isOpen={true} 
          onClose={() => setShowPaymentLinkModal(false)} 
        />
      )}
    </>
  );
};

// --- CREATE INVOICE MODAL (2-Step Workflow) ---
const CreateInvoiceModal: React.FC<{
  userRole: string;
  onClose: () => void;
  onCreated: (invoiceId: string) => void;
}> = ({ userRole, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  const [form, setForm] = useState({
    reference1: '',
    reference2: '',
    nightlyRate: 1000,
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Get booking groups from store
  const bookings = store.getBookings();
  const bookingGroups = Array.from(new Set(bookings.filter(b => b.groupName).map(b => b.groupName!)));
  
  // Get reservations for selected group
  const groupBookings = selectedGroupName 
    ? bookings.filter(b => b.groupName === selectedGroupName && b.status !== BookingStatus.CANCELLED)
    : [];
  
  // Get meal orders for selected group
  const mealOrders = selectedGroupName 
    ? store.getMealOrders().filter(m => m.bookingGroupId === selectedGroupName && m.status !== MealOrderStatus.CANCELLED)
    : [];
  
  // Calculate totals
  const roomTotal = groupBookings.reduce((sum, b) => {
    const startDate = new Date(b.startDate);
    const endDate = new Date(b.endDate);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + (nights * form.nightlyRate);
  }, 0);
  
  const mealTotal = mealOrders.reduce((sum, m) => {
    const item = store.getKitchenItems().find(i => i.id === m.kitchenItemId);
    return sum + ((item?.unitPrice || 0) * m.quantity);
  }, 0);
  
  const subtotal = roomTotal + mealTotal;
  const vatTotal = subtotal * 0.15;
  const total = subtotal + vatTotal;
  
  const handleSelectGroup = (groupName: string) => {
    setSelectedGroupName(groupName);
    setStep(2);
  };
  
  const handleCreate = async () => {
    if (!selectedGroupName || !form.reference1 || !form.reference2) {
      alert(t('billing.fillRequired', 'Please fill all required fields'));
      return;
    }
    
    setIsCreating(true);
    try {
      const invoice = store.createInvoiceFromGroup(selectedGroupName, userRole);
      if (form.reference1 || form.reference2) {
        store.updateInvoice(invoice.id, {
          reference1: form.reference1,
          reference2: form.reference2,
        }, userRole);
      }
      onCreated(invoice.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
      setIsCreating(false);
    }
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title={t('billing.createFromGroup', 'Create Invoice from Group')}>
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            1
                      </div>
          <Text size="xs" muted className="mr-2">{t('billing.step1SelectGroup', 'Select')}</Text>
          <div className={`flex-1 h-px ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            2
                            </div>
          <Text size="xs" muted>{t('billing.step2Review', 'Review')}</Text>
                            </div>
        
        {/* Step 1: Select Group */}
        {step === 1 && (
          <div className="space-y-3">
            <Text size="sm" weight="bold">{t('billing.availableGroups', 'Available Booking Groups')}</Text>
            
            {bookingGroups.length === 0 ? (
              <Card className="p-6 text-center border border-border">
                <Text size="sm" muted>{t('billing.noGroups', 'No booking groups found. Create group bookings first.')}</Text>
              </Card>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bookingGroups.map(groupName => {
                  const groupReservations = bookings.filter(b => b.groupName === groupName && b.status !== BookingStatus.CANCELLED);
                  const primaryBooking = groupReservations[0];
                  
                  return (
                    <Card
                      key={groupName}
                      className="p-3 border border-border cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-colors"
                      onClick={() => handleSelectGroup(groupName)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <Text size="sm" weight="bold">{groupName}</Text>
                          <Text size="xs" muted>
                            {primaryBooking?.customerName || 'Unknown'} • {groupReservations.length} bookings
                              </Text>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </Card>
                  );
                })}
              </div>
                            )}
                          </div>
        )}
        
        {/* Step 2: Preview & Create */}
        {step === 2 && selectedGroupName && (
          <div className="space-y-4">
            {/* Group Info */}
            <Card className="p-3 border border-border bg-muted/30">
              <Text size="sm" weight="bold">{selectedGroupName}</Text>
              <Text size="xs" muted>{groupBookings[0]?.customerName || 'Unknown'} • {groupBookings.length} reservations</Text>
            </Card>
            
            {/* Reservations */}
            <div>
              <Text size="sm" weight="bold" className="mb-2">
                {t('billing.reservationsIncluded', 'Reservations')} ({groupBookings.length})
                            </Text>
              <div className="space-y-1 max-h-28 overflow-y-auto border border-border rounded-lg p-2">
                {groupBookings.map(booking => {
                  const room = store.getRooms().find(r => r.id === booking.roomId);
                  const startDate = new Date(booking.startDate);
                  const endDate = new Date(booking.endDate);
                  const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Text key={booking.id} size="xs" muted>
                      Room {room?.number || booking.roomId} • {nights} nights • {booking.startDate} to {booking.endDate}
                            </Text>
                  );
                })}
                      </div>
            </div>
            
            {/* Meal Orders */}
            {mealOrders.length > 0 && (
              <div>
                <Text size="sm" weight="bold" className="mb-2">
                  {t('billing.mealOrders', 'Meal Orders')} ({mealOrders.length})
                              </Text>
                <div className="space-y-1 border border-border rounded-lg p-2 max-h-20 overflow-y-auto">
                  {mealOrders.slice(0, 5).map(order => {
                    const item = store.getKitchenItems().find(i => i.id === order.kitchenItemId);
                    return (
                      <Text key={order.id} size="xs" muted>
                        {item?.name || order.kitchenItemId} × {order.quantity} = NOK {((item?.unitPrice || 0) * order.quantity).toLocaleString()}
                      </Text>
                    );
                  })}
                  {mealOrders.length > 5 && (
                    <Text size="xs" muted>...and {mealOrders.length - 5} more</Text>
                            )}
                          </div>
              </div>
            )}
            
            {/* References */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="reference1" required>{t('billing.reference1', 'Reference 1')}</Label>
                <Input
                  id="reference1"
                  size="md"
                  value={form.reference1}
                  onChange={e => setForm({...form, reference1: e.target.value})}
                  placeholder="e.g. PO-12345"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reference2" required>{t('billing.reference2', 'Reference 2')}</Label>
                <Input
                  id="reference2"
                  size="md"
                  value={form.reference2}
                  onChange={e => setForm({...form, reference2: e.target.value})}
                  placeholder="e.g. Project-ABC"
                  className="mt-1"
                />
              </div>
            </div>
            
            {/* Nightly Rate */}
            <div>
              <Label htmlFor="nightlyRate" required>{t('billing.nightlyRate', 'Nightly Rate (NOK)')}</Label>
              <Input
                id="nightlyRate"
                type="number"
                size="md"
                value={form.nightlyRate}
                onChange={e => setForm({...form, nightlyRate: parseFloat(e.target.value) || 0})}
                className="mt-1"
              />
            </div>
            
            {/* Totals */}
            <Card className="p-4 border border-border bg-muted/30">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Text size="sm" muted>{t('billing.roomCharges', 'Room Charges')}</Text>
                  <Text size="sm">NOK {roomTotal.toLocaleString()}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" muted>{t('billing.mealCharges', 'Meal Charges')}</Text>
                  <Text size="sm">NOK {mealTotal.toLocaleString()}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" muted>{t('billing.subtotal', 'Subtotal')}</Text>
                  <Text size="sm" weight="medium">NOK {subtotal.toLocaleString()}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="sm" muted>{t('billing.vatTotal', 'VAT (15%)')}</Text>
                  <Text size="sm">NOK {vatTotal.toLocaleString()}</Text>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <Text size="lg" weight="bold">{t('billing.total', 'Total')}</Text>
                  <Text size="lg" weight="bold">NOK {total.toLocaleString()}</Text>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="ghost" className="flex-1" onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
          </Button>
          {step === 2 && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCreate}
              disabled={isCreating || !form.reference1 || !form.reference2}
            >
              {isCreating ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  {t('billing.creating', 'Creating...')}
                </>
              ) : (
                t('billing.createDraftInvoice', 'Create Draft Invoice')
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// --- BILLING VIEW ---
export const BillingView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '' as InvoiceStatus | '',
    from: '',
    to: '',
    search: '',
    exportStatus: '' as AccountingExportStatus | '',
    unpaid: false
  });
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
  
  const currentRole = userRole || 'FINANCE';
  const canCreate = ['ADMIN', 'FINANCE', 'BOOKING_STAFF'].includes(currentRole);
  const canEdit = ['ADMIN', 'FINANCE'].includes(currentRole);
  const canExport = ['ADMIN', 'FINANCE'].includes(currentRole);
  
  const invoices = store.getInvoices({
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    q: filters.search || undefined,
    exportStatus: filters.exportStatus || undefined,
    unpaid: filters.unpaid || undefined
  });
  
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT: return 'bg-slate-100 text-slate-700';
      case InvoiceStatus.SENT: return 'bg-blue-100 text-blue-700';
      case InvoiceStatus.PAID: return 'bg-emerald-100 text-emerald-700';
      case InvoiceStatus.VOID: return 'bg-rose-100 text-rose-700';
    }
  };
  
  const getExportStatus = (invoiceId: string) => {
    const exports = store.getAccountingExportsByInvoice(invoiceId);
    return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('billing.title', 'Billing & Invoicing')}
        subtitle={t('billing.subtitle', 'Manage invoices, payments, and Visma exports')}
        actions={canCreate && (
          <Button 
            variant="primary" 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('billing.createFromGroup', 'Create from Group')}
          </Button>
        )}
      />
      
      {/* Filters */}
      <FilterBar
        primaryFilters={
          <>
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.status', 'Status')}</Text>
              <Select 
                size="md"
                value={filters.status}
                onChange={e => setFilters({...filters, status: e.target.value as InvoiceStatus | ''})}
                className="w-[140px] flex-shrink-0"
                aria-label={t('common.status', 'Status')}
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.values(InvoiceStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            
            <div className="h-6 w-px bg-border mx-1 hidden sm:block flex-shrink-0" />
            
            {/* Date Range */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('billing.fromDate', 'From')}</Text>
              <Input 
                type="date"
                size="md"
                value={filters.from}
                onChange={e => setFilters({...filters, from: e.target.value})}
                className="w-36 flex-shrink-0"
                aria-label={t('billing.fromDate', 'From')}
              />
              <Text size="sm" muted className="flex-shrink-0">-</Text>
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('billing.toDate', 'To')}</Text>
              <Input 
                type="date"
                size="md"
                value={filters.to}
                onChange={e => setFilters({...filters, to: e.target.value})}
                className="w-36 flex-shrink-0"
                aria-label={t('billing.toDate', 'To')}
              />
            </div>
            
            <div className="h-6 w-px bg-border mx-1 hidden sm:block flex-shrink-0" />
            
            {/* Export Status Filter */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('billing.exportStatus', 'Export')}</Text>
              <Select 
                size="md"
                value={filters.exportStatus}
                onChange={e => setFilters({...filters, exportStatus: e.target.value as AccountingExportStatus | ''})}
                className="w-[140px] flex-shrink-0"
                aria-label={t('billing.exportStatus', 'Export')}
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.values(AccountingExportStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            
            {/* Unpaid Only Checkbox */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filters.unpaid}
                  onChange={e => setFilters({...filters, unpaid: e.target.checked})}
                  className="rounded w-4 h-4 cursor-pointer flex-shrink-0"
                />
                <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('billing.unpaidOnly', 'Unpaid only')}</Text>
              </label>
            </div>
          </>
        }
        search={
          <div className="relative w-full">
            <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <Input 
              size="md"
              placeholder={t('billing.searchPlaceholder', 'Invoice, customer...')}
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              className="pl-10 w-full"
            />
          </div>
        }
        onClear={(filters.status || filters.from || filters.to || filters.search || filters.exportStatus || filters.unpaid) ? () => {
          setFilters({ status: '', from: '', to: '', search: '', exportStatus: '', unpaid: false });
        } : undefined}
      />

      {/* Invoices Table */}
      <DataTable
        headers={[
          t('billing.invoiceId', 'Invoice #'),
          t('billing.client', 'Customer'),
          t('billing.status', 'Status'),
          t('billing.total', 'Total'),
          t('billing.dueDate', 'Due Date'),
          t('billing.paymentStatus', 'Payment'),
          t('billing.exportStatus', 'Export'),
          t('billing.created', 'Created'),
          t('common.actions', 'Actions')
        ]}
        isEmpty={invoices.length === 0}
        emptyMessage={t('billing.noInvoices', 'No invoices found')}
      >
        {invoices.map(invoice => {
          const payments = store.getPaymentsByInvoice(invoice.id);
          const exportRecord = getExportStatus(invoice.id);
          const hasPayment = payments.length > 0;
          const paymentStatus = payments.find(p => p.status === PaymentStatus.SUCCEEDED) ? 'Paid' : 
                               payments.find(p => p.status === PaymentStatus.PENDING) ? 'Pending' : 'None';
            
          return (
            <tr 
              key={invoice.id} 
              className="hover:bg-muted/20 transition-colors group cursor-pointer"
              onClick={() => setSelectedInvoiceId(invoice.id)}
            >
              <td className="px-4 py-3 font-mono text-sm text-muted-foreground">#{invoice.id}</td>
              <td className="px-4 py-3">
                <Text size="sm" weight="medium">{invoice.customerName}</Text>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                          </Badge>
                        </td>
              <td className="px-4 py-3 text-right">
                <MoneyValue amount={invoice.total} currency={invoice.currency} className="font-bold text-sm" />
              </td>
              <td className="px-4 py-3">
                <Text size="sm" muted>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</Text>
              </td>
              <td className="px-4 py-3">
                <Text size="xs" muted>{paymentStatus}</Text>
              </td>
              <td className="px-4 py-3">
                {exportRecord ? (
                  <Badge variant="outline" className={`text-[10px] ${
                    exportRecord.status === AccountingExportStatus.SENT || exportRecord.status === AccountingExportStatus.CONFIRMED
                      ? 'bg-emerald-100 text-emerald-700'
                      : exportRecord.status === AccountingExportStatus.FAILED
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {exportRecord.status}
                  </Badge>
                ) : (
                  <Text size="xs" muted>-</Text>
                )}
              </td>
              <td className="px-4 py-3">
                <Text size="xs" muted>{new Date(invoice.createdAt).toLocaleDateString()}</Text>
              </td>
              <td className="px-4 py-3 text-right">
                              <Button 
                  variant="ghost" 
                                size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInvoiceId(invoice.id);
                  }}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t('common.view', 'View')}
                              </Button>
              </td>
            </tr>
          );
        })}
      </DataTable>
      
      {/* Invoice Detail Drawer */}
      {selectedInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoiceId}
          userRole={currentRole}
          onClose={() => setSelectedInvoiceId(null)}
          onUpdate={() => setTick(t => t + 1)}
        />
      )}
      
      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          userRole={currentRole}
          onClose={() => setShowCreateModal(false)}
          onCreated={(invoiceId) => {
            setShowCreateModal(false);
            setSelectedInvoiceId(invoiceId);
            setTick(t => t + 1);
          }}
        />
      )}
    </div>
  );
};

// --- REPORTING, HOUSEKEEPING, MAINTENANCE, KITCHEN, AUDIT LOG VIEWS ---
// (Re-exporting unmodified views to maintain file integrity)
// ... [Previous implementations of ReportingView, HousekeepingView, MaintenanceView, KitchenView, AuditLogView] ...
// To ensure the file is complete, I will copy them back in fully.

// --- REPORTS VIEW ---
export const ReportingView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'invoices'>('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [invoiceFilters, setInvoiceFilters] = useState({
    from: '',
    to: '',
    status: '' as InvoiceStatus | '',
    search: '',
    exportStatus: '' as AccountingExportStatus | '',
    page: 1
  });
  
  const currentRole = userRole || 'VIEWER';
  const canViewOccupancy = ['ADMIN', 'FINANCE', 'BOOKING_STAFF'].includes(currentRole);
  const canViewInvoices = ['ADMIN', 'FINANCE'].includes(currentRole);
  
  // Monthly Occupancy Report
  const monthlyReport = useMemo(() => {
    if (!canViewOccupancy) return null;
    return store.getMonthlyOccupancyReport(month, year);
  }, [month, year, canViewOccupancy]);
  
  // Yearly Occupancy Report
  const yearlyReport = useMemo(() => {
    if (!canViewOccupancy) return null;
    return store.getYearlyOccupancyReport(year);
  }, [year, canViewOccupancy]);
  
  // Invoice History Report
  const invoiceReport = useMemo(() => {
    if (!canViewInvoices) return null;
    return store.getInvoiceHistoryReport({
      from: invoiceFilters.from || undefined,
      to: invoiceFilters.to || undefined,
      status: invoiceFilters.status || undefined,
      q: invoiceFilters.search || undefined,
      exportStatus: invoiceFilters.exportStatus || undefined,
      page: invoiceFilters.page,
      pageSize: 50
    });
  }, [invoiceFilters, canViewInvoices]);
  
  // CSV Export handlers
  const handleExportMonthlyCSV = () => {
    if (!monthlyReport) return;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Rooms Available', monthlyReport.totals.roomsAvailable],
      ['Room Nights Sold', monthlyReport.totals.roomNightsSold],
      ['Guest Nights', monthlyReport.totals.guestNights],
      ['Occupancy Rate %', monthlyReport.totals.occupancyRate.toFixed(2)],
      ['Arrivals', monthlyReport.totals.arrivals],
      ['Departures', monthlyReport.totals.departures]
    ];
    const csv = generateCSV(headers, rows);
    downloadCSV(`occupancy-monthly-${year}-${month.toString().padStart(2, '0')}.csv`, csv);
  };
  
  const handleExportYearlyCSV = () => {
    if (!yearlyReport) return;
    const headers = ['Month', 'Rooms Available', 'Room Nights Sold', 'Guest Nights', 'Occupancy Rate %', 'Arrivals', 'Departures'];
    const rows = yearlyReport.months.map(m => [
      m.monthName,
      m.roomsAvailable,
      m.roomNightsSold,
      m.guestNights,
      m.occupancyRate.toFixed(2),
      m.arrivals,
      m.departures
    ]);
    // Add totals row
    rows.push([
      'TOTAL',
      yearlyReport.yearTotals.roomsAvailable,
      yearlyReport.yearTotals.roomNightsSold,
      yearlyReport.yearTotals.guestNights,
      yearlyReport.yearTotals.occupancyRate.toFixed(2),
      yearlyReport.yearTotals.arrivals,
      yearlyReport.yearTotals.departures
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`occupancy-yearly-${year}.csv`, csv);
  };
  
  const handleExportInvoiceCSV = () => {
    if (!invoiceReport) return;
    const headers = ['Invoice #', 'Customer', 'Status', 'Total', 'Payment Status', 'Export Status', 'Created Date', 'Due Date'];
    const rows = invoiceReport.invoices.map(inv => [
      inv.id,
      inv.customerName,
      inv.status,
      `${inv.currency} ${inv.total.toLocaleString()}`,
      (inv as any).paymentStatus || 'None',
      (inv as any).exportStatus || '-',
      new Date(inv.createdAt).toLocaleDateString(),
      inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'
    ]);
    const csv = generateCSV(headers, rows);
    const dateRange = invoiceFilters.from && invoiceFilters.to 
      ? `${invoiceFilters.from}_to_${invoiceFilters.to}`
      : 'all';
    downloadCSV(`invoice-history-${dateRange}.csv`, csv);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('reports.title', 'Reports')}
        subtitle={t('reports.subtitle', 'Occupancy and invoice reports')}
      />
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-6">
        {canViewOccupancy && (
          <>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'monthly'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('reports.monthly', 'Monthly Occupancy')}
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'yearly'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('reports.yearly', 'Yearly Occupancy')}
            </button>
          </>
        )}
        {canViewInvoices && (
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'invoices'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('reports.invoiceHistory', 'Invoice History')}
          </button>
        )}
      </div>
      
      {/* Monthly Occupancy Tab */}
      {activeTab === 'monthly' && canViewOccupancy && monthlyReport && (
        <div className="space-y-6">
          {/* Controls */}
          <FilterBar
            primaryFilters={
              <>
                <div className="flex items-center gap-2">
                  <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('reports.month', 'Month')}</Text>
                  <Select 
                    size="md"
                    value={month}
                    onChange={e => setMonth(parseInt(e.target.value))}
                    className="w-[180px]"
                    aria-label={t('reports.month', 'Month')}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })}</option>
                    ))}
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('reports.year', 'Year')}</Text>
                  <Input 
                    type="number"
                    size="md"
                    value={year}
                    onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                    min="2020"
                    max={new Date().getFullYear() + 1}
                    className="w-24"
                    aria-label={t('reports.year', 'Year')}
                  />
                </div>
                
                <Button variant="outline" onClick={handleExportMonthlyCSV}>
                  <Download size={16} className="mr-2" />
                  {t('reports.exportCSV', 'Export CSV')}
                </Button>
              </>
            }
          />
          
          {/* KPI Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-6 border border-border">
              <Text size="xs" weight="bold" muted className="mb-2 uppercase tracking-widest">{t('reports.roomsAvailable', 'Rooms Available')}</Text>
              <Text size="2xl" weight="bold">{monthlyReport.totals.roomsAvailable}</Text>
            </Card>
            <Card className="p-6 border border-border">
              <Text size="xs" weight="bold" muted className="mb-2 uppercase tracking-widest">{t('reports.roomNightsSold', 'Room Nights Sold')}</Text>
              <Text size="2xl" weight="bold">{monthlyReport.totals.roomNightsSold}</Text>
            </Card>
            <Card className="p-6 border border-border">
              <Text size="xs" weight="bold" muted className="mb-2 uppercase tracking-widest">{t('reports.guestNights', 'Guest Nights')}</Text>
              <Text size="2xl" weight="bold">{monthlyReport.totals.guestNights}</Text>
            </Card>
            <Card className="p-6 border border-border">
              <Text size="xs" weight="bold" muted className="mb-2 uppercase tracking-widest">{t('reports.occupancyRate', 'Occupancy Rate')}</Text>
              <Text size="2xl" weight="bold">{monthlyReport.totals.occupancyRate.toFixed(2)}%</Text>
            </Card>
            <Card className="p-6 border border-border">
              <Text size="xs" weight="bold" muted className="mb-2 uppercase tracking-widest">{t('reports.arrivals', 'Arrivals')}</Text>
              <Text size="2xl" weight="bold">{monthlyReport.totals.arrivals}</Text>
            </Card>
            <Card className="p-6 border border-border">
              <Text size="xs" weight="bold" muted className="mb-2 uppercase tracking-widest">{t('reports.departures', 'Departures')}</Text>
              <Text size="2xl" weight="bold">{monthlyReport.totals.departures}</Text>
            </Card>
          </div>
          
          {/* Room Type Breakdown (Optional) */}
          {Object.keys(monthlyReport.byRoomType).length > 0 && (
            <div className="space-y-4">
              <Text size="sm" weight="bold" className="uppercase tracking-widest">{t('reports.byRoomType', 'Breakdown by Room Type')}</Text>
              <DataTable
                headers={[
                  t('reports.roomType', 'Room Type'),
                  t('reports.roomsAvailable', 'Rooms Available'),
                  t('reports.roomNightsSold', 'Room Nights Sold'),
                  t('reports.guestNights', 'Guest Nights'),
                  t('reports.occupancyRate', 'Occupancy Rate %')
                ]}
              >
                {Object.entries(monthlyReport.byRoomType).map(([type, data]) => (
                  <tr key={type} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">{type}</td>
                    <td className="px-4 py-3 text-right">{data.roomsAvailable}</td>
                    <td className="px-4 py-3 text-right">{data.roomNightsSold}</td>
                    <td className="px-4 py-3 text-right">{data.guestNights}</td>
                    <td className="px-4 py-3 text-right">{data.occupancyRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}
        </div>
      )}
      
      {/* Yearly Occupancy Tab */}
      {activeTab === 'yearly' && canViewOccupancy && yearlyReport && (
        <div className="space-y-6">
          {/* Controls */}
          <FilterBar
            primaryFilters={
              <>
                <div className="flex items-center gap-2">
                  <Text size="sm" weight="bold" muted className="uppercase tracking-widest">{t('reports.year', 'Year')}</Text>
                  <Input 
                    type="number"
                    size="md"
                    value={year}
                    onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                    min="2020"
                    max={new Date().getFullYear() + 1}
                    className="w-24"
                    aria-label={t('reports.year', 'Year')}
                  />
                </div>
                
                <Button variant="outline" onClick={handleExportYearlyCSV}>
                  <Download size={16} className="mr-2" />
                  {t('reports.exportCSV', 'Export CSV')}
                </Button>
              </>
            }
          />
          
          {/* Yearly Table */}
          <DataTable
            headers={[
              t('reports.month', 'Month'),
              t('reports.roomsAvailable', 'Rooms Available'),
              t('reports.roomNightsSold', 'Room Nights Sold'),
              t('reports.guestNights', 'Guest Nights'),
              t('reports.occupancyRate', 'Occupancy Rate %'),
              t('reports.arrivals', 'Arrivals'),
              t('reports.departures', 'Departures')
            ]}
          >
            {yearlyReport.months.map(m => (
              <tr key={m.month} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{m.monthName}</td>
                <td className="px-4 py-3 text-right">{m.roomsAvailable}</td>
                <td className="px-4 py-3 text-right">{m.roomNightsSold}</td>
                <td className="px-4 py-3 text-right">{m.guestNights}</td>
                <td className="px-4 py-3 text-right">{m.occupancyRate.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{m.arrivals}</td>
                <td className="px-4 py-3 text-right">{m.departures}</td>
              </tr>
            ))}
            <tr className="bg-muted/10 font-bold border-t border-border">
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-right">{yearlyReport.yearTotals.roomsAvailable}</td>
              <td className="px-4 py-3 text-right">{yearlyReport.yearTotals.roomNightsSold}</td>
              <td className="px-4 py-3 text-right">{yearlyReport.yearTotals.guestNights}</td>
              <td className="px-4 py-3 text-right">{yearlyReport.yearTotals.occupancyRate.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right">{yearlyReport.yearTotals.arrivals}</td>
              <td className="px-4 py-3 text-right">{yearlyReport.yearTotals.departures}</td>
            </tr>
          </DataTable>
        </div>
      )}
      
      {/* Invoice History Tab */}
      {activeTab === 'invoices' && canViewInvoices && invoiceReport && (
        <div className="space-y-6">
          {/* Filters */}
          <FilterBar 
            primaryFilters={
              <>
                {/* Date Range */}
                <div className="flex items-center gap-2">
                  <Input 
                    type="date"
                    size="md"
                    value={invoiceFilters.from}
                    onChange={e => setInvoiceFilters({...invoiceFilters, from: e.target.value, page: 1})}
                    className="w-36"
                    aria-label={t('billing.fromDate', 'From')}
                  />
                  <Text size="sm" muted>-</Text>
                  <Input 
                    type="date"
                    size="md"
                    value={invoiceFilters.to}
                    onChange={e => setInvoiceFilters({...invoiceFilters, to: e.target.value, page: 1})}
                    className="w-36"
                    aria-label={t('billing.toDate', 'To')}
                  />
                </div>
                
                <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
                
                {/* Status Filter */}
                <Select 
                  size="md"
                  value={invoiceFilters.status}
                  onChange={e => setInvoiceFilters({...invoiceFilters, status: e.target.value as InvoiceStatus | '', page: 1})}
                  className="w-[140px]"
                  aria-label={t('common.status', 'Status')}
                >
                  <option value="">{t('common.all', 'All')}</option>
                  {Object.values(InvoiceStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                
                <Button variant="outline" onClick={handleExportInvoiceCSV} className="ml-2">
                  <Download size={16} className="mr-2" />
                  {t('reports.exportCSV', 'Export CSV')}
                </Button>
              </>
            }
            search={
              <div className="relative w-full">
                <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input 
                  size="md"
                  placeholder={t('billing.searchPlaceholder', 'Invoice, customer...')}
                  value={invoiceFilters.search}
                  onChange={e => setInvoiceFilters({...invoiceFilters, search: e.target.value, page: 1})}
                  className="pl-10 w-full"
                />
              </div>
            }
            onClear={(invoiceFilters.from || invoiceFilters.to || invoiceFilters.status || invoiceFilters.search) ? () => {
              setInvoiceFilters({ from: '', to: '', status: '', search: '', exportStatus: '', page: 1 });
            } : undefined}
          />
          
          {/* Aggregates */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border border-border">
              <Text size="xs" weight="bold" muted className="mb-1">{t('reports.totalInvoices', 'Total Invoices')}</Text>
              <Text size="xl" weight="bold">{invoiceReport.aggregates.count}</Text>
            </Card>
            <Card className="p-4 border border-border">
              <Text size="xs" weight="bold" muted className="mb-1">{t('reports.totalAmount', 'Total Amount')}</Text>
              <Text size="xl" weight="bold"><MoneyValue amount={invoiceReport.aggregates.sumTotal} currency="NOK" /></Text>
            </Card>
            <Card className="p-4 border border-border">
              <Text size="xs" weight="bold" muted className="mb-1">{t('reports.outstanding', 'Outstanding')}</Text>
              <Text size="xl" weight="bold"><MoneyValue amount={invoiceReport.aggregates.sumOutstanding} currency="NOK" /></Text>
            </Card>
          </div>
          
          {/* Invoice Table */}
          <DataTable
            headers={[
              t('billing.invoiceId', 'Invoice #'),
              t('billing.client', 'Customer'),
              t('billing.status', 'Status'),
              t('billing.total', 'Total'),
              t('billing.paymentStatus', 'Payment'),
              t('billing.exportStatus', 'Export'),
              t('billing.created', 'Created'),
              t('billing.dueDate', 'Due Date')
            ]}
            isEmpty={invoiceReport.invoices.length === 0}
            emptyMessage={t('billing.noInvoices', 'No invoices found')}
          >
            {invoiceReport.invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{inv.id}</td>
                <td className="px-4 py-3">{inv.customerName}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {inv.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <MoneyValue amount={inv.total} currency={inv.currency} className="font-medium" />
                </td>
                <td className="px-4 py-3">
                  <Text size="xs">{(inv as any).paymentStatus || 'None'}</Text>
                </td>
                <td className="px-4 py-3">
                  {(inv as any).exportStatus ? (
                    <Badge variant="outline" className={`text-[10px] ${
                      (inv as any).exportStatus === AccountingExportStatus.SENT || (inv as any).exportStatus === AccountingExportStatus.CONFIRMED
                        ? 'bg-emerald-100 text-emerald-700'
                        : (inv as any).exportStatus === AccountingExportStatus.FAILED
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {(inv as any).exportStatus}
                    </Badge>
                  ) : (
                    <Text size="xs" muted>-</Text>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Text size="xs">{new Date(inv.createdAt).toLocaleDateString()}</Text>
                </td>
                <td className="px-4 py-3">
                  <Text size="xs">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</Text>
                </td>
              </tr>
            ))}
          </DataTable>
            
          {/* Pagination */}
          {invoiceReport.pagination.totalPages > 1 && (
            <div className="p-4 flex items-center justify-between">
              <Text size="xs" muted>
                {t('reports.showing', 'Showing')} {(invoiceReport.pagination.page - 1) * invoiceReport.pagination.pageSize + 1} - {Math.min(invoiceReport.pagination.page * invoiceReport.pagination.pageSize, invoiceReport.pagination.total)} {t('reports.of', 'of')} {invoiceReport.pagination.total}
              </Text>
              <div className="flex gap-2">
                              <Button 
                  variant="outline" 
                                size="sm" 
                  onClick={() => setInvoiceFilters({...invoiceFilters, page: invoiceFilters.page - 1})}
                  disabled={invoiceFilters.page === 1}
                >
                  {t('common.previous', 'Previous')}
                </Button>
                <Button 
                                variant="outline" 
                  size="sm"
                  onClick={() => setInvoiceFilters({...invoiceFilters, page: invoiceFilters.page + 1})}
                  disabled={invoiceFilters.page >= invoiceReport.pagination.totalPages}
                              >
                  {t('common.next', 'Next')}
                              </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Access Denied */}
      {!canViewOccupancy && !canViewInvoices && (
        <Card className="p-12 text-center border border-border/70">
          <Text size="lg" weight="bold" className="opacity-50">{t('reports.accessDenied', 'You do not have access to reports')}</Text>
        </Card>
      )}
                      </div>
  );
};

export const HousekeepingView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [mayRequireBlocking, setMayRequireBlocking] = useState(false);

  // Force re-render on store updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const rooms = store.getRooms();
  const bookings = store.getBookings();
  const taskList = store.getHousekeepingTaskList();

  // Calculate task status from room status
  const getTaskStatus = (room: IRoom): 'pending' | 'in_progress' | 'done' => {
    if (room.status === RoomStatus.CLEAN) return 'done';
    if (room.status === RoomStatus.DIRTY) return 'pending';
    return 'pending'; // OUT_OF_SERVICE is also pending
  };

  // Calculate if task is overdue
  const isTaskOverdue = (task: { room: IRoom; priority: string; nextArrival: { date: string; time: string } | null }): boolean => {
    if (task.room.status === RoomStatus.CLEAN) return false;
    if (task.priority === 'Arrival today' && task.room.status === RoomStatus.DIRTY) return true;
    return false;
  };

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = taskList;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.room.number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Task status filter
    if (taskStatusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = getTaskStatus(item.room);
        return status === taskStatusFilter;
      });
    }

    // Due date filter
    if (dueDateFilter === 'today') {
      filtered = filtered.filter(item => item.priority === 'Arrival today');
    } else if (dueDateFilter === 'overdue') {
      filtered = filtered.filter(item => isTaskOverdue(item));
    }

    // Sort by priority (arrival today > arrival tomorrow > no arrival) and then by room number
    filtered.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        'Arrival today': 0,
        'Arrival tomorrow': 1,
        'No upcoming arrival': 2
      };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.room.number.localeCompare(b.room.number);
    });

    return filtered;
  }, [taskList, searchQuery, taskStatusFilter, dueDateFilter]);

  // Summary counts
  const pendingTasks = filteredTasks.filter(t => getTaskStatus(t.room) === 'pending').length;
  const overdueTasks = filteredTasks.filter(t => isTaskOverdue(t)).length;

  // Helper to translate room type
  const translateRoomType = (type: RoomType, t: any): string => {
    const typeMap: Record<RoomType, string> = {
      [RoomType.SINGLE]: t('rooms.typeSingle', 'Single'),
      [RoomType.DOUBLE]: t('rooms.typeDouble', 'Double'),
      [RoomType.APARTMENT]: t('rooms.typeApartment', 'Apartment')
    };
    return typeMap[type] || type;
  };

  // Helper to translate cleaning trigger (task type)
  const translateTaskType = (trigger: string, t: any): string => {
    switch (trigger) {
      case 'Checkout today': return t('housekeeping.taskTypeCheckout', 'Cleaning after checkout');
      case 'Manual dirty': return t('housekeeping.taskTypeManual', 'Manual clean');
      case 'Deep clean': return t('housekeeping.taskTypeDeep', 'Deep clean');
      default: return trigger;
    }
  };

  // Helper to translate task status
  const translateTaskStatus = (status: 'pending' | 'in_progress' | 'done', t: any): string => {
    switch (status) {
      case 'pending': return t('housekeeping.statusPending', 'Pending');
      case 'in_progress': return t('housekeeping.statusInProgress', 'In progress');
      case 'done': return t('housekeeping.statusDone', 'Done');
      default: return status;
    }
  };

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return filteredTasks.find(t => t.room.id === selectedTaskId) || null;
  }, [selectedTaskId, filteredTasks]);

  const handleMarkClean = async () => {
    if (!selectedTask) return;
    try {
      await store.updateRoomStatus(selectedTask.room.id, RoomStatus.CLEAN, userRole || 'Housekeeping');
      setSelectedTaskId(null);
      setNote('');
      setTick(t => t + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to mark clean');
    }
  };

  const handleReportIssue = () => {
    if (!selectedTask || !issueCategory || !issueDescription) return;
    try {
      // Map housekeeping category to maintenance category
      const categoryMap: Record<string, MaintenanceCategory> = {
        'Damage': MaintenanceCategory.DAMAGE,
        'Missing items': MaintenanceCategory.OTHER,
        'Safety concern': MaintenanceCategory.SAFETY,
        'Other': MaintenanceCategory.OTHER
      };
      
      store.addTicket({
        unitId: selectedTask.room.id,
        title: `${issueCategory} - Unit ${selectedTask.room.number}`,
        category: categoryMap[issueCategory] || MaintenanceCategory.OTHER,
        severity: MaintenanceSeverity.MEDIUM,
        description: issueDescription,
        requiresBlocking: mayRequireBlocking,
        reportedByUserId: userRole || 'Housekeeping'
      }, userRole || 'Housekeeping');
      
      setSelectedTaskId(null);
      setIssueCategory('');
      setIssueDescription('');
      setMayRequireBlocking(false);
      setTick(t => t + 1);
      alert(t('housekeeping.issueReported', 'Issue reported successfully'));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to report issue');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('housekeeping.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('housekeeping.subtitle', 'Cleaning tasks and room readiness')}</p>
        </div>
      </div>

      {/* FILTER BAR - Single row */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white border border-border rounded-lg w-full">
        <div className="flex items-center gap-2">
          {/* Task Status Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('housekeeping.status', 'Status')}</Text>
            <select
              value={taskStatusFilter}
              onChange={e => setTaskStatusFilter(e.target.value as 'all' | 'pending' | 'in_progress' | 'done')}
              className="h-10 px-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[140px]"
              aria-label={t('housekeeping.status', 'Status')}
            >
              <option value="all">{t('housekeeping.allStatuses', 'All')}</option>
              <option value="pending">{t('housekeeping.statusPending', 'Pending')}</option>
              <option value="in_progress">{t('housekeeping.statusInProgress', 'In progress')}</option>
              <option value="done">{t('housekeeping.statusDone', 'Done')}</option>
            </select>
          </div>

          <div className="h-6 w-px bg-border flex-shrink-0" />

          {/* Due Date Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('housekeeping.dueDate', 'Due')}</Text>
            <select
              value={dueDateFilter}
              onChange={e => setDueDateFilter(e.target.value as 'all' | 'today' | 'overdue')}
              className="h-10 px-4 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[140px]"
              aria-label={t('housekeeping.dueDate', 'Due date')}
            >
              <option value="all">{t('housekeeping.all', 'All')}</option>
              <option value="today">{t('housekeeping.today', 'Today')}</option>
              <option value="overdue">{t('housekeeping.overdue', 'Overdue')}</option>
            </select>
          </div>
        </div>

        {/* Room Search - Right aligned */}
        <div className="relative w-64 flex-shrink-0">
          <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t('housekeeping.searchRooms', 'Search by room name/number')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-xs w-full"
          />
        </div>
      </div>

      {/* SUMMARY SECTION - Two cards only */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border border-border bg-white">
          <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.tasksPendingToday', 'Tasks pending today')}</Text>
          <Text size="2xl" weight="bold" className="text-slate-900 leading-none mb-1">{pendingTasks}</Text>
          <Text size="xs" muted>{t('housekeeping.tasks', 'Tasks')}</Text>
        </Card>
        {overdueTasks > 0 ? (
          <Card className="p-4 border border-border bg-white border-rose-200 bg-rose-50">
            <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.tasksOverdue', 'Tasks overdue')}</Text>
            <Text size="2xl" weight="bold" className="text-rose-600 leading-none mb-1">{overdueTasks}</Text>
            <Text size="xs" muted>{t('housekeeping.tasks', 'Tasks')}</Text>
          </Card>
        ) : (
          <Card className="p-4 border border-border bg-white">
            <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.statusDone', 'Done')}</Text>
            <Text size="2xl" weight="bold" className="text-slate-900 leading-none mb-1">{filteredTasks.filter(t => getTaskStatus(t.room) === 'done').length}</Text>
            <Text size="xs" muted>{t('housekeeping.tasks', 'Tasks')}</Text>
          </Card>
        )}
      </div>

      {/* TASK LIST */}
      <Card className="overflow-hidden border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('housekeeping.room', 'Room')}</th>
                <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('housekeeping.taskType', 'Task Type')}</th>
                <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('housekeeping.dueStatus', 'Due Status')}</th>
                <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('housekeeping.status', 'Status')}</th>
                <th className="p-3 text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('housekeeping.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const taskStatus = getTaskStatus(task.room);
                const isOverdue = isTaskOverdue(task);
                return (
                  <tr
                    key={task.room.id}
                    onClick={() => setSelectedTaskId(task.room.id)}
                    className={`cursor-pointer hover:bg-muted/20 transition-colors ${
                      selectedTaskId === task.room.id ? 'bg-primary/5' : ''
                    } ${isOverdue ? 'bg-rose-50/50' : ''}`}
                  >
                    <td className="p-3">
                      <Text weight="bold" size="base">{task.room.number}</Text>
                    </td>
                    <td className="p-3">
                      <Text size="sm" muted>{translateTaskType(task.cleaningTrigger, t)}</Text>
                    </td>
                    <td className="p-3">
                      {isOverdue ? (
                        <Badge variant="destructive" className="text-xs">
                          {t('housekeeping.overdue', 'Overdue')}
                            </Badge>
                      ) : task.priority === 'Arrival today' ? (
                        <Badge variant="warning" className="text-xs">
                          {t('housekeeping.today', 'Today')}
                        </Badge>
                      ) : (
                        <Text size="sm" muted>{t('housekeeping.notUrgent', 'Not urgent')}</Text>
                      )}
                    </td>
                    <td className="p-3">
                          <Badge 
                        variant={taskStatus === 'done' ? 'success' : taskStatus === 'in_progress' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {translateTaskStatus(taskStatus, t)}
                          </Badge>
                        </td>
                    <td className="p-3 text-right">
                              <Button 
                                size="sm" 
                                variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(task.room.id);
                        }}
                        className="text-xs"
                      >
                        {t('housekeeping.open', 'Open')}
                              </Button>
                    </td>
                  </tr>
                    );
                  })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardList size={32} className="text-muted-foreground opacity-50" />
                      <Text size="sm" weight="medium" className="text-muted-foreground">
                        {t('housekeeping.noTasksMatch', 'No housekeeping tasks for selected filters.')}
                            </Text>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      {/* TASK DETAIL PANEL (Drawer) */}
      {selectedTask && (
        <Modal isOpen={!!selectedTask} onClose={() => { setSelectedTaskId(null); setNote(''); setIssueCategory(''); setIssueDescription(''); setMayRequireBlocking(false); }}>
          <div className="space-y-6 max-h-[90vh] overflow-y-auto">
            {/* A. Task Summary */}
            <div className="space-y-4 pb-4 border-b border-border">
              <div>
                <Text size="lg" weight="bold">{t('housekeeping.taskSummary', 'Task Summary')}</Text>
        </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.room', 'Room')}</Text>
                  <Text size="base" weight="bold">{selectedTask.room.number}</Text>
                  <Text size="sm" muted>{translateRoomType(selectedTask.room.type, t)}</Text>
                </div>
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.taskType', 'Task Type')}</Text>
                  <Text size="base" weight="bold">{translateTaskType(selectedTask.cleaningTrigger, t)}</Text>
                </div>
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.dueDate', 'Due Date')}</Text>
                  <Text size="base">
                    {selectedTask.nextArrival ? (
                      <span>{selectedTask.nextArrival.date} {selectedTask.nextArrival.time}</span>
                    ) : (
                      <span className="text-muted-foreground">{t('housekeeping.noDueDate', 'No due date')}</span>
                    )}
                  </Text>
                </div>
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.status', 'Status')}</Text>
                  <Badge
                    variant={getTaskStatus(selectedTask.room) === 'done' ? 'success' : getTaskStatus(selectedTask.room) === 'in_progress' ? 'default' : 'outline'}
                  >
                    {translateTaskStatus(getTaskStatus(selectedTask.room), t)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* B. Room Context */}
            <div className="space-y-4 pb-4 border-b border-border">
              <Text size="base" weight="bold">{t('housekeeping.roomContext', 'Room Context')}</Text>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.condition', 'Condition')}</Text>
                  <Badge
                    variant={selectedTask.room.status === RoomStatus.CLEAN ? 'success' : selectedTask.room.status === RoomStatus.DIRTY ? 'warning' : 'destructive'}
                  >
                    {(() => {
                      const statusMap: Record<RoomStatus, string> = {
                        [RoomStatus.CLEAN]: t('rooms.clean'),
                        [RoomStatus.DIRTY]: t('rooms.dirty'),
                        [RoomStatus.OUT_OF_SERVICE]: t('rooms.outOfService')
                      };
                      return statusMap[selectedTask.room.status] || selectedTask.room.status;
                    })()}
                  </Badge>
                </div>
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.occupancy', 'Occupancy')}</Text>
                  <Text size="sm">
                    {(() => {
                      const booking = bookings.find(b => b.roomId === selectedTask.room.id && b.status === BookingStatus.CHECKED_IN);
                      return booking ? t('housekeeping.occupied', 'Occupied') : t('housekeeping.free', 'Free');
                    })()}
                  </Text>
                </div>
                <div>
                  <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-1">{t('housekeeping.lastCheckout', 'Last Checkout')}</Text>
                  <Text size="sm" muted>
                    {(() => {
                      const checkout = bookings.find(b => b.roomId === selectedTask.room.id && b.status === BookingStatus.CHECKED_OUT && b.endDate === today);
                      return checkout ? today : t('housekeeping.notAvailable', 'N/A');
                    })()}
                  </Text>
                </div>
              </div>
            </div>

            {/* C. Actions */}
            <div className="space-y-4 pb-4 border-b border-border">
              <Text size="base" weight="bold">{t('housekeeping.actions', 'Actions')}</Text>
              <div className="flex flex-col gap-3">
                {selectedTask.room.status === RoomStatus.DIRTY && (
                              <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleMarkClean}
                  >
                    <CheckCircle2 size={16} className="mr-2" />
                    {t('housekeeping.markAsCleaned', 'Mark as cleaned')}
                  </Button>
                )}
                {selectedTask.room.status !== RoomStatus.OUT_OF_SERVICE && (
                  <Button
                                variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Toggle report issue form
                      if (!issueCategory) {
                        // Show form
                      } else {
                        handleReportIssue();
                      }
                    }}
                  >
                    <AlertTriangle size={16} className="mr-2" />
                    {t('housekeeping.reportIssue', 'Report issue')}
                              </Button>
                            )}
              </div>
            </div>

            {/* D. Notes / Observations */}
            <div className="space-y-3 pb-4 border-b border-border">
              <Text size="base" weight="bold">{t('housekeeping.notes', 'Notes / Observations')}</Text>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full h-24 border border-border rounded-lg p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t('housekeeping.notePlaceholder', 'Internal notes...')}
              />
            </div>

            {/* Report Issue Form (if active) */}
            {issueCategory !== '' && (
              <div className="space-y-4 pb-4 border-b border-border bg-rose-50/50 p-4 rounded-lg border border-rose-200">
                <Text size="base" weight="bold">{t('housekeeping.reportIssue', 'Report Issue')}</Text>
                <div>
                  <Text size="sm" weight="bold" className="mb-2">{t('housekeeping.category')} *</Text>
                  <Select
                    size="md"
                    value={issueCategory}
                    onChange={e => setIssueCategory(e.target.value)}
                    className="bg-white"
                    aria-label={t('housekeeping.category')}
                  >
                    <option value="">{t('housekeeping.selectCategory', 'Select category')}</option>
                    <option value="Damage">{t('housekeeping.categoryDamage', 'Damage')}</option>
                    <option value="Missing items">{t('housekeeping.categoryMissingItems', 'Missing items')}</option>
                    <option value="Safety concern">{t('housekeeping.categorySafetyConcern', 'Safety concern')}</option>
                    <option value="Other">{t('housekeeping.categoryOther', 'Other')}</option>
                  </Select>
                </div>
                <div>
                  <Text size="sm" weight="bold" className="mb-2">{t('housekeeping.description')} *</Text>
                  <Textarea
                    size="md"
                    value={issueDescription}
                    onChange={e => setIssueDescription(e.target.value)}
                    className="bg-white"
                    placeholder={t('housekeeping.descriptionPlaceholder', 'Describe the issue...')}
                    rows={4}
                  />
                </div>
                <label className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    checked={mayRequireBlocking}
                    onChange={e => setMayRequireBlocking(e.target.checked)}
                    className="rounded"
                  />
                  <Text size="sm">{t('housekeeping.mayRequireBlocking', 'May require blocking room')}</Text>
                </label>
                <div className="flex gap-3">
                              <Button 
                                variant="ghost" 
                    className="flex-1"
                                onClick={() => {
                      setIssueCategory('');
                      setIssueDescription('');
                      setMayRequireBlocking(false);
                                }}
                              >
                    {t('common.cancel')}
                              </Button>
                  <Button
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={handleReportIssue}
                    disabled={!issueCategory || !issueDescription}
                  >
                    {t('housekeeping.submitReport', 'Submit report')}
                  </Button>
                      </div>
                          </div>
            )}

            {/* E. Audit / History (Collapsed by default) */}
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t('housekeeping.auditHistory', 'Audit / History')}
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>
                  <Text size="xs" weight="bold" className="uppercase tracking-widest">{t('housekeeping.created', 'Created')}</Text>
                  <Text size="sm">{t('housekeeping.notAvailable', 'N/A')}</Text>
                </div>
                <div>
                  <Text size="xs" weight="bold" className="uppercase tracking-widest">{t('housekeeping.completed', 'Completed')}</Text>
                  <Text size="sm">
                    {selectedTask.room.status === RoomStatus.CLEAN ? today : t('housekeeping.notAvailable', 'N/A')}
                            </Text>
                          </div>
                      </div>
            </details>

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => { setSelectedTaskId(null); setNote(''); setIssueCategory(''); setIssueDescription(''); setMayRequireBlocking(false); }}>
                {t('common.close', 'Close')}
              </Button>
          </div>
        </div>
        </Modal>
      )}
    </div>
  );
};

// --- MAINTENANCE QUEUE VIEW ---
export const MaintenanceView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '' as MaintenanceTicketStatus | '',
    severity: '' as MaintenanceSeverity | '',
    category: '' as MaintenanceCategory | '',
    blockedOnly: false,
    search: ''
  });
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
  
  const currentRole = userRole || 'MAINTENANCE';
  const canCreate = ['ADMIN', 'MAINTENANCE', 'BOOKING_STAFF', 'HOUSEKEEPING'].includes(currentRole);
  const canBlock = ['ADMIN', 'MAINTENANCE'].includes(currentRole);
  const canAssign = ['ADMIN', 'MAINTENANCE'].includes(currentRole);
  
  const tickets = store.getTickets({
    status: filters.status || undefined,
    severity: filters.severity || undefined,
    category: filters.category || undefined,
    q: filters.search || undefined,
    blockedOnly: filters.blockedOnly || undefined
  });
  
  const rooms = store.getRooms();
  const bookings = store.getBookings();
  
  const getTicketAge = (ticket: IMaintenanceTicket) => {
    const ageMs = Date.now() - new Date(ticket.requestedAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    if (ageDays > 0) return `${ageDays}d`;
    if (ageHours > 0) return `${ageHours}h`;
    return `${Math.floor(ageMs / (1000 * 60))}m`;
  };
  
  const getNextArrival = (unitId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextBooking = bookings
      .filter(b => b.roomId === unitId && b.status !== BookingStatus.CANCELLED && new Date(b.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
    return nextBooking ? nextBooking.startDate : null;
  };
  
  const getSeverityColor = (severity: MaintenanceSeverity) => {
    switch (severity) {
      case MaintenanceSeverity.CRITICAL: return 'bg-red-100 text-red-800 border-red-200';
      case MaintenanceSeverity.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case MaintenanceSeverity.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case MaintenanceSeverity.LOW: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  const getStatusColor = (status: MaintenanceTicketStatus) => {
    switch (status) {
      case MaintenanceTicketStatus.OPEN: return 'bg-slate-100 text-slate-700';
      case MaintenanceTicketStatus.TRIAGED: return 'bg-blue-100 text-blue-700';
      case MaintenanceTicketStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700';
      case MaintenanceTicketStatus.WAITING_PARTS: return 'bg-purple-100 text-purple-700';
      case MaintenanceTicketStatus.RESOLVED: return 'bg-emerald-100 text-emerald-700';
      case MaintenanceTicketStatus.CLOSED: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <Stack spacing={1}>
          <h1 className="text-2xl font-bold text-foreground">{t('maintenance.title', 'Maintenance Queue')}</h1>
          <Text size="xs" muted>{t('maintenance.subtitle', 'Manage maintenance tickets and unit blocking')}</Text>
        </Stack>
        
        {canCreate && (
          <Button variant="primary" onClick={() => setShowCreateForm(true)}>
            <Plus size={16} className="mr-2" />
            {t('maintenance.createTicket', 'Create Ticket')}
          </Button>
        )}
          </div>
      
      {/* Filters */}
      <div className="flex items-center gap-2 p-3 bg-white border border-border rounded-lg w-full">
        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.status', 'Status')}</Text>
          <Select 
            size="md"
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value as MaintenanceTicketStatus | ''})}
            className="text-sm min-w-[140px]"
            aria-label={t('common.status', 'Status')}
          >
            <option value="">{t('common.all', 'All')}</option>
            {Object.values(MaintenanceTicketStatus).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </Select>
      </div>

        <div className="h-6 w-px bg-border flex-shrink-0" />

        {/* Severity Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('maintenance.severity', 'Severity')}</Text>
          <Select 
            size="md"
            value={filters.severity}
            onChange={e => setFilters({...filters, severity: e.target.value as MaintenanceSeverity | ''})}
            className="text-sm min-w-[140px]"
            aria-label={t('maintenance.severity', 'Severity')}
          >
            <option value="">{t('common.all', 'All')}</option>
            {Object.values(MaintenanceSeverity).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
            </div>

        <div className="h-6 w-px bg-border flex-shrink-0" />

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('maintenance.category', 'Category')}</Text>
          <Select 
            size="md"
            value={filters.category}
            onChange={e => setFilters({...filters, category: e.target.value as MaintenanceCategory | ''})}
            className="text-sm min-w-[140px]"
            aria-label={t('maintenance.category', 'Category')}
          >
            <option value="">{t('common.all', 'All')}</option>
            {Object.values(MaintenanceCategory).map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </Select>
              </div>

        <div className="h-6 w-px bg-border flex-shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <Input 
            size="md"
            placeholder={t('maintenance.searchPlaceholder', 'Unit, ticket ID...')}
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
            className="pl-10 text-sm w-full"
          />
            </div>

        <div className="h-6 w-px bg-border flex-shrink-0" />

        {/* Blocked Only Checkbox */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={filters.blockedOnly}
              onChange={e => setFilters({...filters, blockedOnly: e.target.checked})}
              className="rounded"
            />
            <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('maintenance.blockedOnly', 'Blocked only')}</Text>
          </label>
        </div>
      </div>
      
      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card className="p-12 text-center border border-border/70">
            <HardHat size={48} className="mx-auto mb-4 opacity-30" />
            <Text size="lg" weight="bold" className="opacity-50">{t('maintenance.noTickets', 'No tickets found')}</Text>
          </Card>
        ) : (
          tickets.map(ticket => {
            const room = rooms.find(r => r.id === ticket.unitId);
            const nextArrival = getNextArrival(ticket.unitId);
            const isBlocked = room?.status === RoomStatus.OUT_OF_SERVICE;
            
            return (
              <Card 
                key={ticket.id} 
                className="p-4 border border-border/70 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Text size="sm" weight="bold" className="text-slate-400 font-mono">{ticket.id}</Text>
                      <Text size="lg" weight="bold" className="text-slate-900">{ticket.title}</Text>
                      {isBlocked && (
                        <Badge variant="destructive" className="text-[10px]">
                          {t('rooms.outOfService', 'OUT OF SERVICE')}
                        </Badge>
                      )}
      </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        <Bed size={14} className="text-slate-400" />
                        <Text size="sm" weight="medium">{t('rooms.unit', 'Unit')} {room?.number || ticket.unitId}</Text>
                        {room && <Text size="xs" muted className="ml-1">({room.type})</Text>}
             </div>
                      
                      <Badge variant="outline" className={`text-[10px] ${getSeverityColor(ticket.severity)}`}>
                        {ticket.severity}
                      </Badge>
                      
                      <Badge variant="outline" className={`text-[10px] ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      
                      <Text size="xs" muted>{ticket.category.replace('_', ' ')}</Text>
                      
                      <Text size="xs" muted className="flex items-center gap-1">
                        <Clock size={12} />
                        {getTicketAge(ticket)}
                      </Text>
                      
                      {ticket.assignedToUserId && (
                        <Text size="xs" muted>Assigned: {ticket.assignedToUserId}</Text>
                      )}
                      
                      {nextArrival && (
                        <Text size="xs" muted className="flex items-center gap-1">
                          <Calendar size={12} />
                          Next: {nextArrival}
                        </Text>
                      )}
               </div>
                    
                    <Text size="sm" muted className="line-clamp-2">{ticket.description}</Text>
               </div>
                  
                  <ChevronRight size={20} className="text-slate-400 shrink-0" />
               </div>
              </Card>
            );
          })
        )}
             </div>
      
      {/* Ticket Detail Drawer */}
      {selectedTicketId && (
        <TicketDetailDrawer
          ticketId={selectedTicketId}
          userRole={currentRole}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={() => setTick(t => t + 1)}
        />
      )}
      
      {/* Create Ticket Modal */}
      {showCreateForm && (
        <CreateTicketModal
          userRole={currentRole}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            setTick(t => t + 1);
          }}
        />
      )}
    </div>
  );
};

// --- TICKET DETAIL DRAWER ---
const TicketDetailDrawer: React.FC<{
  ticketId: string;
  userRole: string;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ ticketId, userRole, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [ticket, setTicket] = useState(store.getTicketById(ticketId));
  const [attachments, setAttachments] = useState(store.getTicketAttachments(ticketId));
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    reason: BlockReason.MAINTENANCE,
    note: '',
    expectedReturnAt: ''
  });
  
  useEffect(() => {
    const updated = store.getTicketById(ticketId);
    if (updated) setTicket(updated);
    setAttachments(store.getTicketAttachments(ticketId));
  }, [ticketId]);
  
  if (!ticket) return null;
  
  const room = store.getRoomById(ticket.unitId);
  const impact = store.getRoomImpact(ticket.unitId);
  const isBlocked = room?.status === RoomStatus.OUT_OF_SERVICE;
  const canBlock = ['ADMIN', 'MAINTENANCE'].includes(userRole);
  const canUpdate = ['ADMIN', 'MAINTENANCE'].includes(userRole);
  
  const handleStatusChange = (newStatus: MaintenanceTicketStatus) => {
    try {
      store.updateTicket(ticket.id, { status: newStatus }, userRole);
      setTicket(store.getTicketById(ticketId));
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleAssign = () => {
    const assignTo = prompt(t('maintenance.assignTo', 'Assign to user ID:'), ticket.assignedToUserId || userRole);
    if (assignTo) {
      try {
        store.updateTicket(ticket.id, { assignedToUserId: assignTo }, userRole);
        setTicket(store.getTicketById(ticketId));
        onUpdate();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };
  
  const handleBlock = () => {
    try {
      store.blockUnit(ticket.unitId, {
        reason: blockForm.reason,
        note: blockForm.note || undefined,
        expectedReturnAt: blockForm.expectedReturnAt || undefined,
        linkedTicketId: ticket.id
      }, userRole);
      setShowBlockModal(false);
      setTicket(store.getTicketById(ticketId));
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleRestore = () => {
    try {
      store.restoreUnit(ticket.unitId, userRole);
      setShowRestoreModal(false);
      setTicket(store.getTicketById(ticketId));
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const getSeverityColor = (severity: MaintenanceSeverity) => {
    switch (severity) {
      case MaintenanceSeverity.CRITICAL: return 'bg-red-100 text-red-800 border-red-200';
      case MaintenanceSeverity.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case MaintenanceSeverity.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case MaintenanceSeverity.LOW: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[600px] bg-card border-l border-border shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-border/80/70 pb-4">
            <div>
              <Text size="sm" weight="bold" className="text-slate-400 font-mono">{ticket.id}</Text>
              <Text size="xl" weight="bold" className="text-slate-900">{ticket.title}</Text>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
                      </Button>
          </div>
          
          {/* Status & Severity */}
          <div className="flex gap-3">
            <Badge variant="outline" className={getSeverityColor(ticket.severity)}>
              {ticket.severity}
            </Badge>
            <Badge variant="outline">
              {ticket.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">
              {ticket.category.replace('_', ' ')}
            </Badge>
          </div>
          
          {/* Unit Info */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border/70">
            <div className="flex items-center gap-2 mb-2">
              <Bed size={16} className="text-slate-400" />
              <Text size="lg" weight="bold">{t('rooms.unit', 'Unit')} {room?.number || ticket.unitId}</Text>
              {room && <Text size="sm" muted>({room.type})</Text>}
            </div>
            {isBlocked && (
              <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-200">
                <Text size="sm" weight="bold" className="text-rose-700">
                  {t('rooms.outOfService', 'OUT OF SERVICE')}
                </Text>
                {room.outOfServiceReason && (
                  <Text size="xs" className="text-rose-600 mt-1">Reason: {room.outOfServiceReason}</Text>
                )}
                  </div>
            )}
          </div>
          
          {/* Description */}
          <div>
            <Text size="sm" weight="bold" className="mb-2">{t('maintenance.description', 'Description')}</Text>
            <Text size="sm" className="text-slate-700 whitespace-pre-wrap">{ticket.description}</Text>
          </div>
          
          {/* Attachments */}
          <div>
            <Text size="sm" weight="bold" className="mb-2">{t('maintenance.attachments', 'Attachments')}</Text>
            {attachments.length === 0 ? (
              <Text size="xs" muted>{t('maintenance.noAttachments', 'No attachments')}</Text>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 p-2 border border-border/70 rounded">
                    <FileText size={16} className="text-slate-400" />
                    <Text size="sm" className="flex-1">{att.fileName}</Text>
                    <Text size="xs" muted>{(att.size / 1024).toFixed(1)} KB</Text>
                  </div>
                ))}
        </div>
            )}
            </div>
          
          {/* Blocking Status */}
          <div className="p-4 border border-border/70 rounded-lg">
            <Text size="sm" weight="bold" className="mb-3">{t('maintenance.blockingStatus', 'Blocking Status')}</Text>
            {isBlocked ? (
              <div className="space-y-2">
                <Text size="sm">{t('maintenance.unitIsBlocked', 'Unit is currently blocked')}</Text>
                {room.outOfServiceReason && (
                  <Text size="xs" muted>Reason: {room.outOfServiceReason}</Text>
                )}
                {room.outOfServiceNote && (
                  <Text size="xs" muted>Note: {room.outOfServiceNote}</Text>
                )}
                {room.expectedReturnDate && (
                  <Text size="xs" muted>Expected return: {room.expectedReturnDate}</Text>
                )}
                {canBlock && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowRestoreModal(true)}>
                    {t('rooms.restoreUnit', 'Restore Unit')}
                  </Button>
                )}
            </div>
            ) : (
              <div>
                <Text size="sm" className="mb-3">{t('maintenance.unitNotBlocked', 'Unit is not blocked')}</Text>
                {canBlock && (
                  <Button variant="destructive" size="sm" onClick={() => setShowBlockModal(true)}>
                    {t('rooms.blockUnit', 'Block Unit')}
                  </Button>
                )}
          </div>
            )}
          </div>
          
          {/* Impact */}
          {impact && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Text size="sm" weight="bold" className="mb-2 text-amber-900">{t('maintenance.impact', 'Impact')}</Text>
              <Text size="sm" className="text-amber-800">
                {impact.futureReservationsCount > 0 
                  ? `${impact.futureReservationsCount} ${t('maintenance.futureReservations', 'future reservation(s) affected')}`
                  : t('maintenance.noFutureReservations', 'No future reservations affected')
                }
              </Text>
              {impact.nextArrival && (
                <Text size="xs" className="text-amber-700 mt-1">
                  Next arrival: {impact.nextArrival.date} at {impact.nextArrival.time}
                </Text>
              )}
              {impact.isOccupied && (
                <Text size="xs" weight="bold" className="text-amber-900 mt-2">
                  {t('maintenance.currentlyOccupied', '⚠️ Unit is currently occupied')}
                </Text>
              )}
            </div>
          )}
          
          {/* Actions */}
          {canUpdate && (
            <div className="space-y-3 pt-4 border-t-2 border-border/80/70">
              <div>
                <Text size="sm" weight="bold" className="mb-2">{t('maintenance.changeStatus', 'Change Status')}</Text>
                <div className="flex flex-wrap gap-2">
                  {Object.values(MaintenanceTicketStatus).map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={ticket.status === status ? 'primary' : 'outline'}
                      onClick={() => handleStatusChange(status)}
                      disabled={ticket.status === status}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
    </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleAssign}>
                {ticket.assignedToUserId 
                  ? `${t('maintenance.assignedTo', 'Assigned to')}: ${ticket.assignedToUserId}`
                  : t('maintenance.assign', 'Assign')
                }
              </Button>
            </div>
          )}
          
          {/* Metadata */}
          <div className="pt-4 border-t-2 border-border/80/70 space-y-1">
            <Text size="xs" muted>
              {t('maintenance.reportedBy', 'Reported by')}: {ticket.reportedByUserId}
            </Text>
            <Text size="xs" muted>
              {t('maintenance.requestedAt', 'Requested')}: {new Date(ticket.requestedAt).toLocaleString()}
            </Text>
            <Text size="xs" muted>
              {t('maintenance.updatedAt', 'Updated')}: {new Date(ticket.updatedAt).toLocaleString()}
            </Text>
            {ticket.resolvedAt && (
              <Text size="xs" muted>
                {t('maintenance.resolvedAt', 'Resolved')}: {new Date(ticket.resolvedAt).toLocaleString()}
              </Text>
            )}
          </div>
        </div>
      </div>
      
      {/* Block Unit Modal */}
      {showBlockModal && (
        <BlockUnitModal
          roomId={ticket.unitId}
          ticketId={ticket.id}
          onClose={() => setShowBlockModal(false)}
          onConfirm={handleBlock}
          initialReason={blockForm.reason}
          initialNote={blockForm.note}
          initialExpectedReturn={blockForm.expectedReturnAt}
          onFormChange={setBlockForm}
        />
      )}
      
      {/* Restore Unit Modal */}
      {showRestoreModal && (
        <RestoreUnitModal
          roomId={ticket.unitId}
          onClose={() => setShowRestoreModal(false)}
          onConfirm={handleRestore}
        />
      )}
    </>
  );
};

// --- CREATE TICKET MODAL ---
const CreateTicketModal: React.FC<{
  userRole: string;
  onClose: () => void;
  onCreated: () => void;
}> = ({ userRole, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    unitId: '',
    title: '',
    category: MaintenanceCategory.OTHER,
    severity: MaintenanceSeverity.MEDIUM,
    description: '',
    requiresBlocking: false
  });
  
  const rooms = store.getRooms();
  
  const handleSubmit = () => {
    try {
      if (!form.unitId || !form.title || !form.description) {
        alert(t('maintenance.validationError', 'Please fill all required fields'));
        return;
      }
      
      store.addTicket({
        unitId: form.unitId,
        title: form.title,
        category: form.category,
        severity: form.severity,
        description: form.description,
        requiresBlocking: form.requiresBlocking
      }, userRole);
      
      // If requires blocking, trigger block flow
      if (form.requiresBlocking) {
        // This will be handled by showing block modal after ticket creation
        // For now, just create ticket
      }
      
      onCreated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('maintenance.createTicket', 'Create Maintenance Ticket')}>
      <div className="space-y-4">
        <div className="w-full">
          <Label htmlFor="unitId" required>
            {t('maintenance.selectUnit', 'Select Unit')}
          </Label>
          <Select 
            id="unitId"
            size="md"
            value={form.unitId}
            onChange={e => setForm({...form, unitId: e.target.value})}
            className="mt-1 w-full"
          >
            <option value="">{t('common.select', 'Select...')}</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{t('rooms.unit', 'Unit')} {r.number} ({r.type})</option>
            ))}
          </Select>
      </div>

        <div className="w-full">
          <Label htmlFor="title" required>
            {t('maintenance.title', 'Title')}
          </Label>
          <Input 
            id="title"
            size="md"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            placeholder={t('maintenance.titlePlaceholder', 'Brief description of issue')}
            className="mt-1 w-full"
          />
            </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <Label htmlFor="category" required>
              {t('maintenance.category', 'Category')}
            </Label>
            <Select 
              id="category"
              size="md"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value as MaintenanceCategory})}
              className="mt-1 w-full"
            >
              {Object.values(MaintenanceCategory).map(c => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </Select>
          </div>
          
          <div className="w-full">
            <Label htmlFor="severity" required>
              {t('maintenance.severity', 'Severity')}
            </Label>
            <Select 
              id="severity"
              size="md"
              value={form.severity}
              onChange={e => setForm({...form, severity: e.target.value as MaintenanceSeverity})}
              className="mt-1 w-full"
            >
              {Object.values(MaintenanceSeverity).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>
        
        <div className="w-full">
          <Label htmlFor="description" required>
            {t('maintenance.description', 'Description')}
          </Label>
          <Textarea 
            id="description"
            size="md"
            rows={5}
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            placeholder={t('maintenance.descriptionPlaceholder', 'Detailed description of the issue...')}
            className="mt-1 w-full"
          />
            </div>
        
        <div className="w-full">
          <label className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30">
            <input 
              type="checkbox"
              checked={form.requiresBlocking}
              onChange={e => setForm({...form, requiresBlocking: e.target.checked})}
              className="rounded"
            />
            <Text size="sm">{t('maintenance.requiresBlocking', 'This prevents use of the unit')}</Text>
          </label>
        </div>
        
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit}>
            {t('maintenance.createTicket', 'Create Ticket')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// --- BLOCK UNIT MODAL ---
const BlockUnitModal: React.FC<{
  roomId: string;
  ticketId?: string;
  onClose: () => void;
  onConfirm: () => void;
  initialReason?: BlockReason;
  initialNote?: string;
  initialExpectedReturn?: string;
  onFormChange: (form: { reason: BlockReason; note: string; expectedReturnAt: string }) => void;
}> = ({ roomId, ticketId, onClose, onConfirm, initialReason, initialNote, initialExpectedReturn, onFormChange }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    reason: initialReason || BlockReason.MAINTENANCE,
    note: initialNote || '',
    expectedReturnAt: initialExpectedReturn || ''
  });
  const [showImpact, setShowImpact] = useState(false);
  
  const room = store.getRoomById(roomId);
  const impact = store.getRoomImpact(roomId);
  
  useEffect(() => {
    onFormChange(form);
  }, [form]);
  
  const handleConfirm = () => {
    if (!form.reason) {
      alert(t('maintenance.reasonRequired', 'Reason is required'));
      return;
    }
    onConfirm();
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title={t('rooms.blockUnitTitle', 'Set unit out of service?')}>
      <Stack spacing={4}>
        <Text size="sm" className="text-amber-700">
          {t('maintenance.blockWarning', 'This will immediately block the unit from new bookings. Future reservations must be handled manually.')}
        </Text>
        
        <div>
          <Text size="sm" weight="bold" className="mb-2">{t('rooms.reasonForBlocking', 'Reason for blocking')} *</Text>
          <select 
            className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
            value={form.reason}
            onChange={e => setForm({...form, reason: e.target.value as BlockReason})}
          >
            {Object.values(BlockReason).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
      </div>

        <div>
          <Text size="sm" weight="bold" className="mb-2">{t('rooms.internalNote', 'Internal Note')}</Text>
          <textarea 
            className="w-full p-3 border border-border rounded-lg resize-none"
            rows={3}
            value={form.note}
            onChange={e => setForm({...form, note: e.target.value})}
            placeholder={t('maintenance.notePlaceholder', 'Optional note...')}
          />
            </div>
        
        <div>
          <Text size="sm" weight="bold" className="mb-2">{t('rooms.expectedReturn', 'Expected Return')}</Text>
          <Input 
            type="datetime-local"
            value={form.expectedReturnAt}
            onChange={e => setForm({...form, expectedReturnAt: e.target.value})}
          />
            </div>
        
        <button
          onClick={() => setShowImpact(!showImpact)}
          className="text-left p-3 border border-border rounded-lg hover:bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <Text size="sm" weight="bold">{t('maintenance.viewImpact', 'View Impact')}</Text>
            <ChevronDown size={16} className={showImpact ? 'rotate-180' : ''} />
        </div>
        </button>
        
        {showImpact && impact && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Text size="sm" weight="bold" className="mb-2 text-amber-900">{t('maintenance.impact', 'Impact')}</Text>
            <Text size="sm" className="text-amber-800">
              {impact.futureReservationsCount > 0 
                ? `${impact.futureReservationsCount} ${t('maintenance.futureReservations', 'future reservation(s) affected')}`
                : t('maintenance.noFutureReservations', 'No future reservations affected')
              }
            </Text>
            {impact.nextArrival && (
              <Text size="xs" className="text-amber-700 mt-1">
                Next arrival: {impact.nextArrival.date} at {impact.nextArrival.time} ({impact.nextArrival.customerName})
              </Text>
            )}
            {impact.isOccupied && (
              <Text size="xs" weight="bold" className="text-amber-900 mt-2">
                {t('maintenance.currentlyOccupiedWarning', '⚠️ Unit is currently occupied. Blocking affects future availability only and requires manual handling.')}
              </Text>
      )}
    </div>
        )}
        
        <div className="flex gap-3 pt-4 border-t-2 border-border/80/70">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleConfirm}>
            {t('maintenance.confirmAndBlock', 'Confirm and Block')}
          </Button>
        </div>
      </Stack>
    </Modal>
  );
};

// --- RESTORE UNIT MODAL ---
const RestoreUnitModal: React.FC<{
  roomId: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ roomId, onClose, onConfirm }) => {
  const { t } = useTranslation();
  
  return (
    <Modal isOpen={true} onClose={onClose} title={t('maintenance.restoreUnitTitle', 'Restore unit to service?')}>
      <Stack spacing={4}>
        <Text size="sm" className="text-slate-700">
          {t('maintenance.restoreWarning', 'The unit will become bookable again. Condition will be set to DIRTY until housekeeping confirms it is clean.')}
        </Text>
        
        <div className="flex gap-3 pt-4 border-t-2 border-border/80/70">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm}>
            {t('rooms.restoreUnit', 'Restore Unit')}
          </Button>
        </div>
      </Stack>
    </Modal>
  );
};

// --- KITCHEN BOARD VIEW (Large Screen) ---
export const KitchenBoardView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [dateRange, setDateRange] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [statusFilter, setStatusFilter] = useState<MealOrderStatus[]>([]);
  
  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);
  
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const week = new Date(today);
    week.setDate(week.getDate() + 7);
    
    switch (dateRange) {
      case 'today':
        return { from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      case 'tomorrow':
        return { from: tomorrow.toISOString().split('T')[0], to: tomorrow.toISOString().split('T')[0] };
      case 'week':
        return { from: today.toISOString().split('T')[0], to: week.toISOString().split('T')[0] };
    }
  };
  
  const dateRangeObj = getDateRange();
  const boardData = store.getKitchenBoard(dateRangeObj);
  const filteredOrders = statusFilter.length > 0 
    ? boardData.filter(o => statusFilter.includes(o.status))
    : boardData.filter(o => o.status !== MealOrderStatus.DELIVERED && o.status !== MealOrderStatus.CANCELLED);
  
  const canUpdateStatus = userRole === 'ADMIN' || userRole === 'KITCHEN';
  
  const handleStatusChange = (orderId: string, newStatus: MealOrderStatus) => {
    try {
      store.updateMealOrderStatus(orderId, newStatus, userRole || 'Kitchen');
      setTick(t => t + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleCancel = (orderId: string) => {
    if (!confirm(t('kitchen.confirmCancel', 'Are you sure you want to cancel this order?'))) return;
    try {
      store.cancelMealOrder(orderId, userRole || 'Kitchen');
      setTick(t => t + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const getStatusColor = (status: MealOrderStatus) => {
    switch (status) {
      case MealOrderStatus.PLANNED: return 'bg-slate-100 text-slate-700 border-slate-200';
      case MealOrderStatus.IN_PREP: return 'bg-blue-100 text-blue-700 border-blue-200';
      case MealOrderStatus.READY: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case MealOrderStatus.DELIVERED: return 'bg-gray-100 text-gray-500 border-gray-200';
      case MealOrderStatus.CANCELLED: return 'bg-rose-100 text-rose-700 border-rose-200';
    }
  };
  
  const formatDateTime = (dateTime: string) => {
    const d = new Date(dateTime);
    return {
      date: d.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' }),
      time: d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };
  };
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <Stack spacing={1}>
          <Text size="lg" weight="bold" className="uppercase tracking-widest text-slate-800">{t('kitchen.board.title', 'Kitchen Board')}</Text>
          <Text size="xs" muted>{t('kitchen.board.subtitle', 'Live order display for kitchen operations')}</Text>
      </Stack>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('today')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                dateRange === 'today' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border hover:border-primary/50'
              }`}
            >
              {t('common.today', 'Today')}
            </button>
            <button
              onClick={() => setDateRange('tomorrow')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                dateRange === 'tomorrow' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border hover:border-primary/50'
              }`}
            >
              {t('common.tomorrow', 'Tomorrow')}
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                dateRange === 'week' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border hover:border-primary/50'
              }`}
            >
              {t('common.week', '+7 Days')}
            </button>
            </div>
            </div>
            </div>
      
      {/* Orders Grid - Large Screen Optimized */}
      {filteredOrders.length === 0 ? (
        <Card className="p-20 text-center border-dashed border-2 border-border/70">
          <Utensils size={64} className="mx-auto mb-4 opacity-30" />
          <Text size="lg" weight="bold" className="opacity-50">{t('kitchen.board.noOrders', 'No orders in selected range')}</Text>
          </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredOrders.map(order => {
            const dt = formatDateTime(order.orderDateTime);
            const statusColor = getStatusColor(order.status);
            
            return (
              <Card key={order.id} className="p-6 border border-border/70 bg-white hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Text weight="bold" size="xl" className="text-slate-900">{order.itemName}</Text>
                    <Text size="xs" muted className="mt-1">{dt.date} {dt.time}</Text>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0 border border-primary/20">
                    x{order.quantity}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <Badge variant="outline" className={`w-fit text-[10px] uppercase font-bold ${statusColor}`}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin size={12} />
                    <Text size="xs">{order.servingLocation}</Text>
                  </div>
                  {order.reference && (
                    <Text size="xs" weight="medium" className="text-slate-700">
                      {order.reference}
                    </Text>
                  )}
                  {order.notes && (
                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                      <Text size="xs" className="text-amber-900 italic">{order.notes}</Text>
      </div>
                  )}
                </div>
                
                {canUpdateStatus && (
                  <div className="flex flex-col gap-2 pt-4 border-t-2 border-border/80/60">
                    {order.status === MealOrderStatus.PLANNED && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(order.id, MealOrderStatus.IN_PREP)}>
                        {t('kitchen.startPrep', 'Start Prep')}
                      </Button>
                    )}
                    {order.status === MealOrderStatus.IN_PREP && (
                      <Button size="sm" variant="primary" onClick={() => handleStatusChange(order.id, MealOrderStatus.READY)}>
                        {t('kitchen.markReady', 'Mark Ready')}
                      </Button>
                    )}
                    {order.status === MealOrderStatus.READY && (
                      <Button size="sm" variant="success" onClick={() => handleStatusChange(order.id, MealOrderStatus.DELIVERED)}>
                        {t('kitchen.markDelivered', 'Mark Delivered')}
                      </Button>
                    )}
                    {(order.status === MealOrderStatus.PLANNED || order.status === MealOrderStatus.IN_PREP) && (
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(order.id)}>
                        {t('kitchen.cancel', 'Cancel')}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- MEAL ORDERS MANAGEMENT VIEW ---
export const MealOrdersView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<MealOrderStatus[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    orderDateTime: new Date().toISOString().slice(0, 16),
    kitchenItemId: '',
    quantity: 1,
    servingLocation: 'Dining Room',
    referenceText: '',
    notes: '',
    bookingGroupId: '',
    reservationId: '',
    customerId: ''
  });
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
  
  const kitchenItems = store.getKitchenItems(true);
  const bookings = store.getBookings();
  const orders = store.getMealOrders({
    from: dateFrom,
    to: dateTo,
    status: statusFilter.length > 0 ? statusFilter[0] : undefined,
    q: searchQuery
  });
  
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.referenceText?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q) ||
        o.servingLocation.toLowerCase().includes(q)
      );
    }
    if (statusFilter.length > 0) {
      filtered = filtered.filter(o => statusFilter.includes(o.status));
    }
    return filtered;
  }, [orders, searchQuery, statusFilter]);
  
  const handleCreateOrder = () => {
    try {
      if (!form.kitchenItemId || form.quantity < 1 || !form.servingLocation) {
        alert(t('kitchen.orders.validationError', 'Please fill all required fields'));
        return;
      }
      
      const orderData: Omit<IMealOrder, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'createdByUserId'> = {
        orderDateTime: new Date(form.orderDateTime).toISOString(),
        quantity: form.quantity,
        kitchenItemId: form.kitchenItemId,
        servingLocation: form.servingLocation,
        referenceText: form.referenceText || undefined,
        notes: form.notes || undefined,
        bookingGroupId: form.bookingGroupId || undefined,
        reservationId: form.reservationId || undefined,
        customerId: form.customerId || undefined
      };
      
      store.addMealOrder(orderData, userRole || 'Booking Staff');
      setShowForm(false);
      setForm({
        orderDateTime: new Date().toISOString().slice(0, 16),
        kitchenItemId: '',
        quantity: 1,
        servingLocation: 'Dining Room',
        referenceText: '',
        notes: '',
        bookingGroupId: '',
        reservationId: '',
        customerId: ''
      });
      setTick(t => t + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const getStatusColor = (status: MealOrderStatus) => {
    switch (status) {
      case MealOrderStatus.PLANNED: return 'bg-slate-100 text-slate-700';
      case MealOrderStatus.IN_PREP: return 'bg-blue-100 text-blue-700';
      case MealOrderStatus.READY: return 'bg-emerald-100 text-emerald-700';
      case MealOrderStatus.DELIVERED: return 'bg-gray-100 text-gray-500';
      case MealOrderStatus.CANCELLED: return 'bg-rose-100 text-rose-700';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <Stack spacing={1}>
          <Text size="lg" weight="bold" className="uppercase tracking-widest text-slate-800">{t('kitchen.orders.title', 'Meal Orders')}</Text>
          <Text size="xs" muted>{t('kitchen.orders.subtitle', 'Manage meal orders for bookings and groups')}</Text>
        </Stack>
        
        {(userRole === 'ADMIN' || userRole === 'BOOKING_STAFF') && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={16} className="mr-2" />
            {t('kitchen.orders.create', 'Create Order')}
          </Button>
        )}
          </div>
      
      {/* Filters */}
      <Card className="p-4 border border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.dateFrom', 'From')}</Text>
              <Input type="date" size="md" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
        </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.dateTo', 'To')}</Text>
              <Input type="date" size="md" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.status', 'Status')}</Text>
              <select 
                className="h-10 rounded-md border border-border bg-background px-4 text-sm min-w-[140px]"
                value={statusFilter.length > 0 ? statusFilter[0] : ''}
                onChange={e => setStatusFilter(e.target.value ? [e.target.value as MealOrderStatus] : [])}
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.values(MealOrderStatus).map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
             </select>
          </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Text size="sm" weight="bold" muted className="uppercase tracking-widest whitespace-nowrap">{t('common.search', 'Search')}</Text>
            <Input 
              size="md"
              placeholder={t('kitchen.orders.searchPlaceholder', 'Reference, notes')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </Card>
      
      {/* Orders Table */}
      <Card className="overflow-hidden border border-border/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b-2 border-border/80/70">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-widest">{t('kitchen.orders.dateTime', 'Date/Time')}</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest">{t('kitchen.orders.item', 'Item')}</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest">{t('kitchen.orders.quantity', 'Qty')}</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest">{t('kitchen.orders.location', 'Location')}</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest">{t('kitchen.orders.reference', 'Reference')}</th>
                <th className="p-4 text-xs font-bold uppercase tracking-widest">{t('common.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.map(order => {
                const item = kitchenItems.find(i => i.id === order.kitchenItemId);
                const dt = new Date(order.orderDateTime);
                return (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <Text size="sm" weight="medium">{dt.toLocaleDateString('no-NO')}</Text>
                      <Text size="xs" muted>{dt.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </td>
                    <td className="p-4">
                      <Text size="sm" weight="bold">{item?.name || 'Unknown'}</Text>
                    </td>
                    <td className="p-4">
                      <Text size="sm">{order.quantity}</Text>
                    </td>
                    <td className="p-4">
                      <Text size="sm">{order.servingLocation}</Text>
                    </td>
                    <td className="p-4">
                      <Text size="sm">{order.referenceText || order.bookingGroupId || order.reservationId || '-'}</Text>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-12 text-center">
              <Text size="sm" muted>{t('kitchen.orders.noOrders', 'No orders found')}</Text>
            </div>
        )}
            </div>
          </Card>
      
      {/* Create Order Modal */}
      {showForm && (
        <Modal isOpen={true} onClose={() => setShowForm(false)} title={t('kitchen.orders.create', 'Create Meal Order')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <Label htmlFor="orderDateTime" required>
                  {t('kitchen.orders.dateTime', 'Date & Time')}
                </Label>
                <Input 
                  id="orderDateTime"
                  type="datetime-local"
                  size="md"
                  value={form.orderDateTime}
                  onChange={e => setForm({...form, orderDateTime: e.target.value})}
                  className="mt-1 w-full"
                />
              </div>
              
              <div className="w-full">
                <Label htmlFor="kitchenItemId" required>
                  {t('kitchen.orders.item', 'Item')}
                </Label>
                <Select 
                  id="kitchenItemId"
                  size="md"
                  value={form.kitchenItemId}
                  onChange={e => setForm({...form, kitchenItemId: e.target.value})}
                  className="mt-1 w-full"
                >
                  <option value="">{t('common.select', 'Select...')}</option>
                  {kitchenItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} - NOK {item.unitPrice}</option>
                  ))}
                </Select>
      </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <Label htmlFor="quantity" required>
                  {t('kitchen.orders.quantity', 'Quantity')}
                </Label>
                <Input 
                  id="quantity"
                  type="number"
                  size="md"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})}
                  className="mt-1 w-full"
                />
              </div>
              <div className="w-full">
                <Label htmlFor="servingLocation" required>
                  {t('kitchen.orders.location', 'Serving Location')}
                </Label>
                <Input 
                  id="servingLocation"
                  size="md"
                  value={form.servingLocation}
                  onChange={e => setForm({...form, servingLocation: e.target.value})}
                  placeholder="Dining Room"
                  className="mt-1 w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <Label htmlFor="referenceText">
                  {t('kitchen.orders.reference', 'Reference')}
                </Label>
                <Input 
                  id="referenceText"
                  size="md"
                  value={form.referenceText}
                  onChange={e => setForm({...form, referenceText: e.target.value})}
                  placeholder={t('kitchen.orders.referencePlaceholder', 'Group name, booking ref...')}
                  className="mt-1 w-full"
                />
              </div>
              
              <div className="w-full">
                <Label htmlFor="reservationId">
                  {t('kitchen.orders.linkToBooking', 'Link to Booking (Optional)')}
                </Label>
                <Select 
                  id="reservationId"
                  size="md"
                  value={form.reservationId}
                  onChange={e => {
                    const booking = bookings.find(b => b.id === e.target.value);
                    setForm({
                      ...form,
                      reservationId: e.target.value,
                      bookingGroupId: booking?.groupName || '',
                      customerId: booking?.customerEmail || '',
                      referenceText: booking?.groupName || booking?.customerName || form.referenceText
                    });
                  }}
                  className="mt-1 w-full"
                >
                  <option value="">{t('common.none', 'None')}</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.customerName} - {b.startDate} to {b.endDate} {b.groupName ? `(${b.groupName})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div className="w-full">
              <Label htmlFor="notes">
                {t('kitchen.orders.notes', 'Notes')}
              </Label>
              <Textarea 
                id="notes"
                size="md"
                rows={3}
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                placeholder={t('kitchen.orders.notesPlaceholder', 'Allergies, timing instructions...')}
                className="mt-1 w-full"
              />
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleCreateOrder}>
                {t('common.create', 'Create')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- KITCHEN ITEMS CATALOG VIEW ---
export const KitchenItemsView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [items, setItems] = useState(store.getKitchenItems());
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<IKitchenItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    unitPrice: 0,
    vatCode: VatCode.VAT_15,
    isActive: true
  });
  
  const canManage = userRole === 'ADMIN' || userRole === 'KITCHEN';
  
  const handleSave = () => {
    try {
      if (!form.name || form.unitPrice <= 0) {
        alert(t('kitchen.items.validationError', 'Name and price are required'));
        return;
      }
      
      if (editingItem) {
        store.updateKitchenItem(editingItem.id, form, userRole || 'Admin');
      } else {
        store.addKitchenItem(form, userRole || 'Admin');
      }
      
      setItems(store.getKitchenItems());
      setShowForm(false);
      setEditingItem(null);
      setForm({ name: '', description: '', unitPrice: 0, vatCode: VatCode.VAT_15, isActive: true });
      setTick(t => t + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const handleEdit = (item: IKitchenItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      unitPrice: item.unitPrice,
      vatCode: item.vatCode,
      isActive: item.isActive
    });
    setShowForm(true);
  };
  
  const handleToggleActive = (item: IKitchenItem) => {
    store.updateKitchenItem(item.id, { isActive: !item.isActive }, userRole || 'Admin');
    setItems([...store.getKitchenItems()]);
    setTick(t => t + 1);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <Stack spacing={1}>
          <Text size="lg" weight="bold" className="uppercase tracking-widest text-slate-800">{t('kitchen.items.title', 'Kitchen Items Catalog')}</Text>
          <Text size="xs" muted>{t('kitchen.items.subtitle', 'Manage menu items and pricing')}</Text>
      </Stack>
        
        {canManage && (
          <Button variant="primary" onClick={() => {
            setEditingItem(null);
            setForm({ name: '', description: '', unitPrice: 0, vatCode: VatCode.VAT_15, isActive: true });
            setShowForm(true);
          }}>
            <Plus size={16} className="mr-2" />
            {t('kitchen.items.add', 'Add Item')}
          </Button>
        )}
              </div>
      
      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <Card key={item.id} className="p-4 border border-border/70 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <Text size="lg" weight="bold" className="text-slate-900">{item.name}</Text>
                {item.description && (
                  <Text size="xs" muted className="mt-1">{item.description}</Text>
                )}
            </div>
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
              </Badge>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <Text size="sm" muted>{t('kitchen.items.price', 'Price')}</Text>
                <Text size="sm" weight="bold">NOK {item.unitPrice}</Text>
              </div>
              <div className="flex justify-between">
                <Text size="sm" muted>{t('kitchen.items.vat', 'VAT')}</Text>
                <Text size="sm" weight="bold">{item.vatCode}%</Text>
              </div>
            </div>
            
            {canManage && (
              <div className="flex gap-2 mt-auto pt-4 border-t-2 border-border/80/60">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(item)}>
                  {t('common.edit', 'Edit')}
                </Button>
                <Button 
                  size="sm" 
                  variant={item.isActive ? 'warning' : 'success'}
                  className="flex-1"
                  onClick={() => handleToggleActive(item)}
                >
                  {item.isActive ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {/* Create/Edit Modal */}
      {showForm && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
            setForm({ name: '', description: '', unitPrice: 0, vatCode: VatCode.VAT_15, isActive: true });
          }}
          title={editingItem ? t('kitchen.items.edit', 'Edit Item') : t('kitchen.items.add', 'Add Item')}
        >
          <div className="space-y-4">
            {/* Row 1: Name and Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 w-full">
                <Label htmlFor="itemName" required>
                  {t('kitchen.items.name', 'Name')}
                </Label>
                <Input 
                  id="itemName"
                  size="md"
                  className="w-full"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder={t('kitchen.items.namePlaceholder', 'Item name')}
                />
              </div>
              <div className="space-y-1 w-full">
                <Label htmlFor="itemDescription">
                  {t('kitchen.items.description', 'Description')}
                </Label>
                <Input 
                  id="itemDescription"
                  size="md"
                  className="w-full"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder={t('kitchen.items.descriptionPlaceholder', 'Optional description')}
                />
              </div>
            </div>
            
            {/* Row 2: Price and VAT Code */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 w-full">
                <Label htmlFor="itemPrice" required>
                  {t('kitchen.items.price', 'Price')} (NOK)
                </Label>
                <Input 
                  id="itemPrice"
                  type="number"
                  size="md"
                  className="w-full"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={e => setForm({...form, unitPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-1 w-full">
                <Label htmlFor="itemVat" required>
                  {t('kitchen.items.vat', 'VAT Code')}
                </Label>
                <Select 
                  id="itemVat"
                  size="md"
                  className="w-full"
                  value={form.vatCode.toString()}
                  onChange={e => setForm({...form, vatCode: parseInt(e.target.value) as VatCode})}
                >
                  <option value={VatCode.VAT_15}>15%</option>
                  <option value={VatCode.VAT_25}>25%</option>
                </Select>
              </div>
            </div>
            
            {/* Row 3: Active checkbox */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({...form, isActive: e.target.checked})}
                  className="rounded w-4 h-4 cursor-pointer"
                />
                <Text size="sm">{t('kitchen.items.active', 'Active (available for ordering)')}</Text>
              </label>
            </div>
            
            <div className="flex gap-3 pt-3 border-t-2 border-border">
              <Button variant="ghost" className="flex-1" onClick={() => {
                setShowForm(false);
                setEditingItem(null);
                setForm({ name: '', description: '', unitPrice: 0, vatCode: VatCode.VAT_15, isActive: true });
              }}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSave}>
                {t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </Modal>
        )}
      </div>
  );
};

// --- KITCHEN CONTAINER VIEW (with sub-navigation) ---
export const KitchenView = ({ userRole }: { userRole?: string }) => {
  const { t } = useTranslation();
  const [subView, setSubView] = useState<'board' | 'orders' | 'items'>('board');
  const currentUserRole = userRole || 'KITCHEN';
  
  const canManageItems = currentUserRole === 'ADMIN' || currentUserRole === 'KITCHEN';
  const canCreateOrders = currentUserRole === 'ADMIN' || currentUserRole === 'BOOKING_STAFF';
  
  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex gap-2 border-b-2 border-border/80/70">
        <button
          onClick={() => setSubView('board')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
            subView === 'board'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('kitchen.nav.board', 'Board')}
        </button>
        {canCreateOrders && (
          <button
            onClick={() => setSubView('orders')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              subView === 'orders'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('kitchen.nav.orders', 'Orders')}
          </button>
        )}
        {canManageItems && (
          <button
            onClick={() => setSubView('items')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              subView === 'items'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('kitchen.nav.items', 'Items')}
          </button>
        )}
      </div>
      
      {/* Render sub-view */}
      {subView === 'board' && <KitchenBoardView userRole={currentUserRole} />}
      {subView === 'orders' && <MealOrdersView userRole={currentUserRole} />}
      {subView === 'items' && <KitchenItemsView userRole={currentUserRole} />}
    </div>
  );
};

// --- REUSABLE AUDIT LOG LIST COMPONENT ---
const AuditLogList: React.FC<{
  entityType?: AuditEntityType;
  entityId?: string;
  limit?: number;
  showDetails?: boolean;
}> = ({ entityType, entityId, limit = 20, showDetails = false }) => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);
  
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    store.getAuditLogs({
      entityType,
      entityId,
      limit
    }).then(result => {
      if (!cancelled) {
        setLogs(result);
        setLoading(false);
      }
    }).catch(error => {
      console.error('Failed to fetch audit logs:', error);
      if (!cancelled) {
        setLogs([]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [entityType, entityId, limit, tick]);
  
  if (logs.length === 0) {
    return (
      <div className="p-8 text-center">
        <Text size="sm" muted>{t('audit.noLogs', 'No audit logs found')}</Text>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="p-3 border border-border/70 rounded-lg hover:bg-muted/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px] font-bold uppercase">
                  {log.entityType}
                </Badge>
                <Text size="xs" muted className="font-mono">
                  {new Date(log.createdAt).toLocaleString()}
                </Text>
                {log.actorUserId && (
                  <Text size="xs" muted>by {log.actorUserId}</Text>
                )}
              </div>
              <Text size="sm" weight="medium" className="mb-1">
                {log.message}
              </Text>
              {showDetails && (log.before || log.after) && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    {t('audit.viewDetails', 'View details')}
                  </summary>
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                    {log.before && (
                      <div className="mb-2">
                        <Text size="xs" weight="bold">Before:</Text>
                        <pre className="text-xs overflow-auto">{JSON.stringify(log.before, null, 2)}</pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <Text size="xs" weight="bold">After:</Text>
                        <pre className="text-xs overflow-auto">{JSON.stringify(log.after, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- GLOBAL AUDIT LOG VIEW ---
export const AuditLogView = () => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entityType: '' as AuditEntityType | '',
    action: '' as AuditAction | '',
    actorUserId: '',
    from: '',
    to: '',
    q: ''
  });
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    store.getAuditLogs({
      entityType: filters.entityType || undefined,
      action: filters.action || undefined,
      actorUserId: filters.actorUserId || undefined,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      q: filters.q || undefined,
      limit: 500
    }).then(auditLogs => {
      if (!cancelled) {
        setLogs(auditLogs);
        setLoading(false);
      }
    }).catch(error => {
      console.error('Failed to fetch audit logs:', error);
      if (!cancelled) {
        setLogs([]);
        setLoading(false);
      }
    });
    
    return () => { cancelled = true; };
  }, [filters, tick]);
  
  if (loading && logs.length === 0) {
  return (
      <div className="space-y-6">
      <Stack spacing={1}>
          <Text size="lg" weight="bold">{t('audit.title', 'System Audit Log')}</Text>
          <Text size="xs" muted>{t('audit.subtitle', 'Complete audit trail of all system events and actions')}</Text>
      </Stack>
        <div className="flex items-center justify-center p-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <Text size="sm" muted>{t('audit.loading', 'Loading audit logs...')}</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stack spacing={1}>
        <Text size="lg" weight="bold">{t('audit.title', 'System Audit Log')}</Text>
        <Text size="xs" muted>{t('audit.subtitle', 'Complete audit trail of all system events and actions')}</Text>
      </Stack>
      
      {/* Filters */}
      <Card className="p-4 border border-border/70">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Text size="xs" weight="bold" className="mb-2">{t('audit.entityType', 'Entity Type')}</Text>
            <select 
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={filters.entityType}
              onChange={e => setFilters({...filters, entityType: e.target.value as AuditEntityType | ''})}
            >
              <option value="">{t('common.all', 'All')}</option>
              {Object.values(AuditEntityType).map(et => (
                <option key={et} value={et}>{et.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Text size="xs" weight="bold" className="mb-2">{t('audit.action', 'Action')}</Text>
            <select 
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={filters.action}
              onChange={e => setFilters({...filters, action: e.target.value as AuditAction | ''})}
            >
              <option value="">{t('common.all', 'All')}</option>
              {Object.values(AuditAction).slice(0, 20).map(act => (
                <option key={act} value={act}>{act.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Text size="xs" weight="bold" className="mb-2">{t('audit.actor', 'Actor')}</Text>
            <Input 
              placeholder={t('audit.actorPlaceholder', 'User ID...')}
              value={filters.actorUserId}
              onChange={e => setFilters({...filters, actorUserId: e.target.value})}
            />
          </div>
          
          <div>
            <Text size="xs" weight="bold" className="mb-2">{t('common.dateFrom', 'From')}</Text>
            <Input 
              type="date"
              value={filters.from}
              onChange={e => setFilters({...filters, from: e.target.value})}
            />
          </div>
          
          <div>
            <Text size="xs" weight="bold" className="mb-2">{t('common.dateTo', 'To')}</Text>
            <Input 
              type="date"
              value={filters.to}
              onChange={e => setFilters({...filters, to: e.target.value})}
            />
          </div>
          
          <div>
            <Text size="xs" weight="bold" className="mb-2">{t('common.search', 'Search')}</Text>
            <Input 
              placeholder={t('audit.searchPlaceholder', 'Message, ID...')}
              value={filters.q}
              onChange={e => setFilters({...filters, q: e.target.value})}
            />
          </div>
        </div>
      </Card>
      
      {/* Logs Table */}
      <Card className="overflow-hidden border border-border/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b-2 border-border/80">
              <tr>
                <th className="p-4 text-xs font-bold uppercase">{t('audit.timestamp', 'Timestamp')}</th>
                <th className="p-4 text-xs font-bold uppercase">{t('audit.entity', 'Entity')}</th>
                <th className="p-4 text-xs font-bold uppercase">{t('audit.action', 'Action')}</th>
                <th className="p-4 text-xs font-bold uppercase">{t('audit.actor', 'Actor')}</th>
                <th className="p-4 text-xs font-bold uppercase">{t('audit.message', 'Message')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <Text size="xs" className="font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </Text>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[9px] font-bold uppercase w-fit">
                        {log.entityType}
                      </Badge>
                      {log.entityId && (
                        <Text size="xs" muted className="font-mono">{log.entityId}</Text>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Text size="xs" weight="medium" className="uppercase">
                      {log.action.replace(/_/g, ' ')}
                    </Text>
                  </td>
                  <td className="p-4">
                    <Text size="xs">
                      {log.actorUserId || 'SYSTEM'}
                    </Text>
                    {log.actorRoles.length > 0 && (
                      <Text size="xs" muted className="text-[10px]">
                        ({log.actorRoles.join(', ')})
                      </Text>
                    )}
                  </td>
                  <td className="p-4">
                    <Text size="sm">{log.message}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="p-12 text-center">
              <Text size="sm" muted>{t('audit.noLogs', 'No audit logs found')}</Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
