import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, Text, Button, Badge, Stack, Input
} from './XalaUI';
import { UserRole } from '../types';
import { 
  LogIn, LogOut, AlertCircle, 
  CreditCard, Sparkles, Utensils, CheckCircle2,
  Clock, RefreshCw, Calendar, Wrench
} from 'lucide-react';
import { getDashboardSummary, DashboardSummary } from '../services/dashboardApiService';
import { store } from '../services/storeService';
import { MaintenanceTicketStatus, MaintenanceSeverity, BookingStatus, RoomStatus, AccountingExportStatus } from '../types';

interface DashboardProps {
  userRole: UserRole;
  onNavigate: (view: string) => void;
}

// ============================================================================
// 1. PAGE HEADER
// ============================================================================
const DashboardHeader: React.FC<{
  date: string;
  onDateChange: (date: string) => void;
}> = ({ date, onDateChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b-2 border-border">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">{t('dashboard.title', 'Dashboard')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle', 'Operational overview for today')}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="date"
            size="md"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label={t('dashboard.selectDate', 'Select date')}
            className="pl-10 pr-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. KPI SUMMARY ROW
// ============================================================================
const KpiRow: React.FC<{
  summary: DashboardSummary;
  onNavigate: (view: string) => void;
}> = ({ summary, onNavigate }) => {
  const { t } = useTranslation();
  
  // Read fresh data directly from store for real-time updates
  const rooms = store.getRooms();
  const bookings = store.getBookings();
  const housekeepingTaskList = store.getHousekeepingTaskList();
  const invoices = store.getInvoices();
  
  // Calculate today's date
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  
  // Available rooms (CLEAN status)
  const cleanCount = rooms.filter(r => r.status === RoomStatus.CLEAN).length;
  
  // Occupied rooms (bookings that cover today)
  const occupiedToday = bookings.filter(b => {
    if (b.status === BookingStatus.CANCELLED) return false;
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start <= todayDate && end > todayDate;
  }).length;
  
  // Occupancy rate
  const occupancyRate = rooms.length > 0
    ? Math.round((occupiedToday / rooms.length) * 100)
    : 0;
  
  // Housekeeping pending tasks (DIRTY rooms)
  const pendingHousekeepingTasks = housekeepingTaskList.filter(t => 
    t.room.status === RoomStatus.DIRTY
  ).length;
  
  // Out of service rooms
  const outOfServiceCount = rooms.filter(r => r.status === RoomStatus.OUT_OF_SERVICE).length;
  
  // Failed Visma exports - check all invoices for failed exports
  const vismaExportsFailed = invoices.reduce((count, invoice) => {
    const exports = store.getAccountingExportsByInvoice(invoice.id);
    const hasFailed = exports.some((e: any) => 
      e.status === AccountingExportStatus.FAILED || e.status === 'FAILED'
    );
    return count + (hasFailed ? 1 : 0);
  }, 0);
  
  // Alerts = OOS rooms + failed exports
  const alertsCount = outOfServiceCount + vismaExportsFailed;

  // Core KPIs - removed arrivals/departures to avoid duplication with detailed blocks below
  const kpis = [
    {
      label: t('dashboard.roomsAvailable', 'Available'),
      value: cleanCount,
      sub: t('dashboard.rooms', 'Rooms'),
      view: 'Rooms',
    },
    {
      label: t('dashboard.roomsOccupied', 'Occupied'),
      value: occupiedToday,
      sub: `${occupancyRate}%`,
      view: 'Bookings',
    },
    {
      label: t('dashboard.housekeepingPending', 'Housekeeping'),
      value: pendingHousekeepingTasks,
      sub: t('dashboard.pending', 'Pending'),
      view: 'Housekeeping',
    },
    {
      label: t('dashboard.alerts', 'Alerts'),
      value: alertsCount,
      sub: t('dashboard.exceptions', 'Exceptions'),
      view: 'Maintenance',
    },
  ];

  const gridCols = 'md:grid-cols-2 lg:grid-cols-4';
  
  return (
    <div className={`grid grid-cols-2 ${gridCols} gap-4`}>
      {kpis.map((kpi, idx) => (
        <Card 
          key={idx} 
          className="p-6 border border-border bg-white shadow-token-sm min-h-[120px] flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-primary/50 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => onNavigate(kpi.view)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate(kpi.view);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`${kpi.label}: ${kpi.value} ${kpi.sub}. Click to navigate to ${kpi.view}`}
        >
          <Text size="xs" weight="bold" className="uppercase tracking-widest mb-3 text-foreground/70">{kpi.label}</Text>
          <div className="space-y-2">
            <Text size="3xl" weight="bold" className="text-foreground leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</Text>
            <Text size="sm" weight="medium" className="text-foreground/70">{kpi.sub}</Text>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ============================================================================
// 3. TODAY'S OPERATIONS - ARRIVALS
// ============================================================================
const ArrivalsBlock: React.FC<{
  arrivals: DashboardSummary['arrivals'];
  onNavigate: (view: string) => void;
}> = ({ arrivals, onNavigate }) => {
  const { t } = useTranslation();
  
  // Read fresh data directly from store for real-time updates
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  
  const bookings = store.getBookings();
  const rooms = store.getRooms();
  
  // Filter for arrivals today (startDate = today)
  const arrivalsToday = bookings.filter(b => {
    if (b.status === BookingStatus.CANCELLED) return false;
    const startDate = new Date(b.startDate);
    startDate.setHours(0, 0, 0, 0);
    return startDate.getTime() === todayDate.getTime();
  });
  
  // Map to arrival items
  const arrivalItems = arrivalsToday.slice(0, 10).map(b => ({
    reservationId: b.id,
    roomId: b.roomId,
    roomNumber: rooms.find(r => r.id === b.roomId)?.number || '',
    customerName: b.customerName,
    startDate: b.startDate,
    status: b.status,
  }));
  
  const maxRows = 10;
  const showViewAll = arrivalsToday.length > maxRows;
  const displayItems = arrivalItems.slice(0, maxRows);

  return (
    <Card className="border border-border bg-white shadow-token-sm">
      <div className="p-5 border-b-2 border-border bg-muted/40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LogIn size={18} className="text-emerald-600" />
          <Text size="base" weight="bold" className="uppercase tracking-widest text-foreground">{t('dashboard.arrivalsToday')}</Text>
        </div>
        <Badge variant="secondary" className="bg-white border-2 border-border text-foreground font-bold">{arrivalsToday.length}</Badge>
      </div>
      <div className="divide-y divide-border">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <LogIn size={24} className="mb-2 opacity-50" />
            <Text size="xs" className="italic">{t('dashboard.noPendingArrivals')}</Text>
          </div>
        ) : (
          <>
            {displayItems.map(arrival => {
              const startTime = new Date(arrival.startDate);
              return (
                <div key={arrival.reservationId} className="p-5 hover:bg-muted/30 transition-colors min-h-[80px] flex items-center border-b border-border/50">
                  <div className="grid grid-cols-4 gap-6 items-center w-full">
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('rooms.unit', 'Unit')}</Text>
                      <Text size="base" weight="bold" className="text-foreground">{arrival.roomNumber}</Text>
                    </div>
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('bookings.customer', 'Customer')}</Text>
                      <Text size="base" weight="medium" className="text-foreground">{arrival.customerName || 'Guest'}</Text>
                    </div>
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('dashboard.time', 'Time')}</Text>
                      <Text size="base" weight="medium" className="font-mono text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>{startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </div>
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('common.status', 'Status')}</Text>
                      <Badge 
                        variant={arrival.status === 'CONFIRMED' ? 'success' : 'outline'} 
                        className="text-xs px-2 py-1 font-semibold"
                      >
                        {arrival.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
            {showViewAll && (
              <div className="p-4 border-t border-border">
        <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('Bookings')}
                  className="w-full text-primary hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t('dashboard.viewAll', 'View all arrivals')} ({arrivalsToday.length - maxRows} {t('dashboard.more', 'more')})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

// ============================================================================
// 4. TODAY'S OPERATIONS - DEPARTURES
// ============================================================================
const DeparturesBlock: React.FC<{
  departures: DashboardSummary['departures'];
  onNavigate: (view: string) => void;
}> = ({ departures, onNavigate }) => {
  const { t } = useTranslation();
  
  // Read fresh data directly from store for real-time updates
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  
  const bookings = store.getBookings();
  const rooms = store.getRooms();
  
  // Filter for departures today (endDate = today)
  const departuresToday = bookings.filter(b => {
    if (b.status === BookingStatus.CANCELLED) return false;
    const endDate = new Date(b.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate.getTime() === todayDate.getTime();
  });
  
  // Map to departure items
  const departureItems = departuresToday.slice(0, 10).map(b => ({
    reservationId: b.id,
    roomId: b.roomId,
    roomNumber: rooms.find(r => r.id === b.roomId)?.number || '',
    customerName: b.customerName,
    endDate: b.endDate,
    status: b.status,
  }));
  
  const maxRows = 10;
  const showViewAll = departuresToday.length > maxRows;
  const displayItems = departureItems.slice(0, maxRows);

  return (
    <Card className="border border-border bg-white shadow-token-sm">
      <div className="p-5 border-b-2 border-border bg-muted/40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LogOut size={18} className="text-rose-600" />
          <Text size="base" weight="bold" className="uppercase tracking-widest text-foreground">{t('dashboard.departuresToday')}</Text>
            </div>
        <Badge variant="secondary" className="bg-white border-2 border-border text-foreground font-bold">{departuresToday.length}</Badge>
      </div>
      <div className="divide-y divide-border">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <LogOut size={24} className="mb-2 opacity-50" />
            <Text size="xs" className="italic">{t('dashboard.noPendingDepartures')}</Text>
          </div>
        ) : (
          <>
            {displayItems.map(departure => {
              const endTime = new Date(departure.endDate);
              return (
                <div key={departure.reservationId} className="p-5 hover:bg-muted/30 transition-colors min-h-[80px] flex items-center border-b border-border/50">
                  <div className="grid grid-cols-4 gap-6 items-center w-full">
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('rooms.unit', 'Unit')}</Text>
                      <Text size="base" weight="bold" className="text-foreground">{departure.roomNumber}</Text>
                    </div>
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('dashboard.booking', 'Booking')}</Text>
                      <Text size="base" weight="medium" className="font-mono text-foreground">{departure.reservationId.slice(0, 8)}</Text>
                    </div>
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('dashboard.time', 'Time')}</Text>
                      <Text size="base" weight="medium" className="font-mono text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>{endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </div>
                    <div>
                      <Text size="xs" weight="bold" className="uppercase tracking-widest mb-2 text-foreground/60">{t('common.status', 'Status')}</Text>
                      <Badge variant="outline" className="text-xs px-2 py-1 font-semibold">
                        {departure.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
            {showViewAll && (
              <div className="p-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('Bookings')}
                  className="w-full text-primary hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t('dashboard.viewAll', 'View all departures')} ({departuresToday.length - maxRows} {t('dashboard.more', 'more')})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
        </Card>
  );
};

// ============================================================================
// 5. TASKS & WORK QUEUES
// ============================================================================
const TaskQueues: React.FC<{
  summary: DashboardSummary;
  onNavigate: (view: string) => void;
}> = ({ summary, onNavigate }) => {
  const { t } = useTranslation();
  
  // Get maintenance tickets data directly from store (fresh data)
  const maintenanceTickets = store.getTickets();
  const openTickets = maintenanceTickets.filter(t => 
    t.status === MaintenanceTicketStatus.OPEN || 
    t.status === MaintenanceTicketStatus.TRIAGED || 
    t.status === MaintenanceTicketStatus.IN_PROGRESS
  );
  const criticalTickets = openTickets.filter(t => 
    t.severity === MaintenanceSeverity.CRITICAL || 
    t.severity === MaintenanceSeverity.HIGH
  ).length;

  // Get housekeeping tasks directly from store (fresh data) - same as HousekeepingView
  const housekeepingTaskList = store.getHousekeepingTaskList();
  const pendingHousekeepingTasks = housekeepingTaskList.filter(t => 
    t.room.status === RoomStatus.DIRTY
  );
  const today = new Date().toISOString().split('T')[0];
  const dueTodayTasks = pendingHousekeepingTasks.filter(t => {
    if (!t.nextArrival) return false;
    const arrivalDate = new Date(t.nextArrival.date);
    arrivalDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    return arrivalDate.getTime() === todayDate.getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Housekeeping Queue */}
      <Card className="border border-border bg-white shadow-token-sm">
        <div className="p-5 border-b-2 border-border bg-muted/40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-indigo-600" />
            <Text size="base" weight="bold" className="uppercase tracking-widest text-foreground">{t('dashboard.housekeeping', 'Housekeeping')}</Text>
          </div>
          <Badge variant="secondary" className="bg-white border-2 border-border text-foreground font-bold">
            {pendingHousekeepingTasks.length}
          </Badge>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <Text size="sm" weight="bold" className="text-foreground/70">{t('dashboard.pendingTasks', 'Pending tasks')}</Text>
            <Text size="base" weight="bold" className="text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>{pendingHousekeepingTasks.length}</Text>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <Text size="sm" weight="bold" className="text-foreground/70">{t('dashboard.dueToday', 'Due today')}</Text>
            <Text size="base" weight="bold" className="text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>{dueTodayTasks.length}</Text>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('Housekeeping')}
              className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('dashboard.goToHousekeeping', 'Go to housekeeping')}
            </Button>
          </div>
           </div>
      </Card>

      {/* Maintenance Queue */}
      <Card className="border border-border bg-white shadow-token-sm">
        <div className="p-5 border-b-2 border-border bg-muted/40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Wrench size={18} className="text-amber-600" />
            <Text size="base" weight="bold" className="uppercase tracking-widest text-foreground">{t('dashboard.maintenance', 'Maintenance')}</Text>
             </div>
          <Badge variant="secondary" className="bg-white border-2 border-border text-foreground font-bold">
            {openTickets.length}
                   </Badge>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <Text size="sm" weight="bold" className="text-foreground/70">{t('dashboard.openTickets', 'Open tickets')}</Text>
            <Text size="base" weight="bold" className="text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>{openTickets.length}</Text>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <Text size="sm" weight="bold" className="text-foreground/70">{t('dashboard.criticalHigh', 'Critical / High')}</Text>
            <Text size="base" weight="bold" className={criticalTickets > 0 ? "text-amber-600" : "text-foreground"} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {criticalTickets}
            </Text>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('Maintenance')}
              className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('dashboard.goToMaintenance', 'Go to maintenance')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// 5. ALERTS & EXCEPTIONS
// ============================================================================
const AlertsBlock: React.FC<{
  summary: DashboardSummary;
  onNavigate: (view: string) => void;
}> = ({ summary, onNavigate }) => {
  const { t } = useTranslation();

  const alerts = useMemo(() => {
    const items: Array<{ type: string; title: string; view: string; id: string }> = [];
    
    // Failed invoice exports
    if (summary.billing?.vismaExportsFailed && summary.billing.vismaExportsFailed > 0) {
      items.push({
        type: 'Finance',
        title: `${summary.billing.vismaExportsFailed} ${t('dashboard.failedVismaExports', 'Failed Visma Export(s)')}`,
        view: 'Billing',
        id: 'visma-failed',
      });
    }

    // Draft invoices (if significant)
    if (summary.billing?.invoicesDraft && summary.billing.invoicesDraft > 5) {
      items.push({
        type: 'Finance',
        title: `${summary.billing.invoicesDraft} ${t('dashboard.draftInvoices', 'Draft Invoice(s)')}`,
        view: 'Billing',
        id: 'invoices-draft',
      });
    }

    // Rooms out of service with active bookings (would need additional data)
    // This is a placeholder - would need backend to provide this
    if (summary.rooms.outOfServiceCount > 0) {
      items.push({
        type: 'Maintenance',
        title: `${summary.rooms.outOfServiceCount} ${t('dashboard.roomsBlocked', 'Room(s) blocked')}`,
        view: 'Rooms',
        id: 'rooms-blocked',
      });
    }

    return items;
  }, [summary, t]);

  if (alerts.length === 0) {
    return (
      <Card className="bg-emerald-50/50 border-emerald-100 border-2 border-dashed shadow-token-sm p-8 flex items-center justify-center gap-3 min-h-[120px]">
        <CheckCircle2 size={20} className="text-emerald-500" />
        <Text size="sm" weight="medium" className="text-emerald-700">{t('dashboard.allSystemsOperational')}</Text>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-rose-500 shadow-token-md bg-white overflow-hidden">
      <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertCircle size={18} />
          <Text size="sm" weight="bold" className="uppercase tracking-widest">{t('dashboard.alertsExceptions', 'Alerts & Exceptions')}</Text>
        </div>
        <Badge className="bg-rose-200 text-rose-800 border-none px-2">{alerts.length}</Badge>
      </div>
      <div className="divide-y divide-border">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors min-h-[64px]">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-white border-border text-[10px] uppercase font-bold w-20 justify-center">{alert.type}</Badge>
              <Text size="sm" weight="medium" className="text-slate-700">{alert.title}</Text>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onNavigate(alert.view)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs uppercase tracking-wide focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('dashboard.view', 'View')}
            </Button>
                 </div>
               ))}
             </div>
        </Card>
  );
};

// ============================================================================
// 6. FINANCIAL SNAPSHOT (Conditional)
// ============================================================================
const FinanceBlock: React.FC<{
  billing: NonNullable<DashboardSummary['billing']>;
  onNavigate: (view: string) => void;
}> = ({ billing, onNavigate }) => {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-white shadow-token-sm">
      <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-slate-600" />
          <Text size="sm" weight="bold" className="uppercase tracking-widest text-slate-700">{t('dashboard.financialSnapshot', 'Financial Snapshot')}</Text>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <Text size="xs" weight="medium" muted>{t('dashboard.invoicesDraft', 'Invoices draft')}</Text>
          <Text size="sm" weight="bold" className="text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{billing.invoicesDraft}</Text>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <Text size="xs" weight="medium" muted>{t('dashboard.invoicesSent', 'Invoices sent')}</Text>
          <Text size="sm" weight="bold" className="text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{billing.invoicesSent}</Text>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <Text size="xs" weight="medium" muted>{t('dashboard.invoicesUnpaid', 'Unpaid / overdue')}</Text>
          <Text size="sm" weight="bold" className="text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {billing.invoicesSent - billing.invoicesPaid}
          </Text>
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('Billing')}
            className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('dashboard.goToBilling', 'Go to billing')}
          </Button>
        </div>
          </div>
        </Card>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard summary with fallback to store service
  const fetchSummary = async (date?: string, isRefresh: boolean = false) => {
    try {
      // Only show full loading state if we don't have data yet
      if (!summary && !isRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await getDashboardSummary(date || selectedDate);
        setSummary(data);
      } catch (apiError: any) {
        // Fallback to store service if API is not available
        console.warn('API not available, using store service:', apiError);
        const targetDate = date || selectedDate || new Date().toISOString().split('T')[0];
        const rooms = store.getRooms();
        const bookings = store.getBookings();
        const housekeepingTasks = store.getHousekeepingTaskList();
        const maintenanceTickets = store.getTickets();
        const invoices = store.getInvoices();
        
        // Filter bookings for target date
        const targetDateObj = new Date(targetDate);
        targetDateObj.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const arrivals = bookings.filter(b => {
          const startDate = new Date(b.startDate);
          startDate.setHours(0, 0, 0, 0);
          return startDate.getTime() === targetDateObj.getTime() && 
                 b.status !== BookingStatus.CANCELLED;
        });
        
        const departures = bookings.filter(b => {
          const endDate = new Date(b.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate.getTime() === targetDateObj.getTime() && 
                 b.status !== BookingStatus.CANCELLED;
        });
        
        // Get all housekeeping tasks (for all rooms)
        // Filter for pending tasks (DIRTY rooms) - same logic as HousekeepingView
        const pendingHousekeepingTasks = housekeepingTasks.filter(t => {
          // Pending tasks are rooms that are DIRTY (need cleaning)
          return t.room.status === RoomStatus.DIRTY;
        });
        
        // Tasks due today are pending tasks with arrival today
        const dueTodayTasks = pendingHousekeepingTasks.filter(t => {
          if (!t.nextArrival) return false;
          const arrivalDate = new Date(t.nextArrival.date);
          arrivalDate.setHours(0, 0, 0, 0);
          return arrivalDate.getTime() === targetDateObj.getTime();
        });
        
        const data: DashboardSummary = {
          date: targetDate,
          rooms: {
            total: rooms.length,
            cleanCount: rooms.filter(r => r.status === RoomStatus.CLEAN).length,
            dirtyCount: rooms.filter(r => r.status === RoomStatus.DIRTY).length,
            outOfServiceCount: rooms.filter(r => r.status === RoomStatus.OUT_OF_SERVICE).length,
          },
          occupancy: {
            occupiedToday: bookings.filter(b => {
              const start = new Date(b.startDate);
              const end = new Date(b.endDate);
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              return start <= targetDateObj && end > targetDateObj && 
                     b.status !== BookingStatus.CANCELLED;
            }).length,
            reservedToday: 0,
            freeToday: 0,
          },
          arrivals: {
            count: arrivals.length,
            items: arrivals.slice(0, 10).map(b => ({
              reservationId: b.id,
              roomId: b.roomId,
              roomNumber: rooms.find(r => r.id === b.roomId)?.number || '',
              customerName: b.customerName,
              startDate: b.startDate,
              status: b.status,
            })),
          },
          departures: {
            count: departures.length,
            items: departures.slice(0, 10).map(b => ({
              reservationId: b.id,
              roomId: b.roomId,
              roomNumber: rooms.find(r => r.id === b.roomId)?.number || '',
              endDate: b.endDate,
              status: b.status,
            })),
          },
          housekeeping: {
            tasksPending: pendingHousekeepingTasks.length,
            tasksDueToday: dueTodayTasks.length,
            items: pendingHousekeepingTasks.slice(0, 10).map(t => ({
              taskId: `task-${t.room.id}`,
              roomId: t.room.id,
              roomNumber: t.room.number,
              status: t.room.status,
              dueDate: t.nextArrival?.date || '',
            })),
          },
          kitchen: {
            ordersNext24h: 0,
            items: [],
          },
          billing: invoices.length > 0 ? {
            invoicesDraft: invoices.filter(i => i.status === 'DRAFT').length,
            invoicesSent: invoices.filter(i => i.status === 'SENT').length,
            invoicesPaid: invoices.filter(i => i.status === 'PAID').length,
            vismaExportsPending: 0,
            vismaExportsFailed: 0,
          } : undefined,
        };
        
        setSummary(data);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSummary();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchSummary(selectedDate, true), 30000);
    
    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSummary(selectedDate, true);
      }
    };
    
    // Refresh when window gains focus (user switches back to app)
    const handleFocus = () => {
      fetchSummary(selectedDate, true);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Refresh when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      fetchSummary(selectedDate, false);
    }
  }, [selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchSummary(date, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSummary(selectedDate, true);
  };

  // Loading state
  if (loading && !summary) {
    return (
      <div className="max-w-[1920px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="flex items-center justify-center p-20">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={32} className="animate-spin text-blue-600" />
            <Text size="sm" muted>{t('dashboard.loading', 'Loading dashboard...')}</Text>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className="max-w-[1920px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
        <Card className="border-l-4 border-l-rose-500 bg-rose-50/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-600" />
              <div>
                <Text size="sm" weight="bold" className="text-rose-800">{t('dashboard.error', 'Error loading dashboard')}</Text>
                <Text size="xs" muted className="text-rose-600">{error}</Text>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="border-rose-300 text-rose-700 hover:bg-rose-100">
              <RefreshCw size={14} className="mr-2" />
              {t('dashboard.retry', 'Retry')}
            </Button>
          </div>
        </Card>
          </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-[1920px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
        <Card className="p-12 text-center">
          <Text size="sm" muted>{t('dashboard.noActivity', 'No activity for selected date.')}</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 1. Page Header */}
      <DashboardHeader
        date={selectedDate}
        onDateChange={handleDateChange}
      />

      {/* 2. KPI Summary Row */}
      <div className="space-y-6">
        <KpiRow summary={summary} onNavigate={onNavigate} />
      </div>

      {/* 3. Today's Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArrivalsBlock arrivals={summary.arrivals} onNavigate={onNavigate} />
        <DeparturesBlock departures={summary.departures} onNavigate={onNavigate} />
      </div>

      {/* 4. Tasks & Work Queues */}
      <div className="space-y-6">
        <TaskQueues summary={summary} onNavigate={onNavigate} />
      </div>

      {/* 5. Alerts & Exceptions */}
      <div className="space-y-6">
        <AlertsBlock summary={summary} onNavigate={onNavigate} />
        </div>

      {/* 6. Financial Snapshot (Conditional) */}
      {summary.billing && (userRole === UserRole.ADMIN || userRole === UserRole.FINANCE) && (
        <div className="space-y-6">
          <FinanceBlock billing={summary.billing} onNavigate={onNavigate} />
        </div>
      )}

    </div>
  );
};
