import React, { useState, useEffect } from 'react';
import { 
  Card, Text, Button, Badge, Stack
} from './XalaUI';
import { store } from '../services/storeService';
import { UserRole, BookingStatus, RoomStatus, MaintenancePriority } from '../types';
import { 
  ArrowRight, User, LogOut, LogIn, Bed, AlertCircle, 
  CreditCard, Moon, Plus, AlertTriangle, Sparkles,
  Activity, Server, Database, Utensils, CheckCircle2,
  Clock, XCircle, Calendar, ChevronRight
} from 'lucide-react';

interface DashboardProps {
  userRole: UserRole;
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => {
  // Force re-render on store updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000); 
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const rooms = store.getRooms();
  const bookings = store.getBookings();
  const meals = store.getMeals();
  const tasks = store.getHousekeepingTasks();
  const tickets = store.getTickets();
  const invoices = store.getInvoices();
  const logs = store.getLogs();
  const lastAudit = store.getAuditSummaries().slice(-1)[0];

  // --- DATA AGGREGATION ---
  const activeBookings = bookings.filter(b => b.status === BookingStatus.CHECKED_IN);
  const arrivalsToday = bookings.filter(b => b.startDate === today && b.status === BookingStatus.CONFIRMED);
  const departuresToday = bookings.filter(b => b.endDate === today && b.status === BookingStatus.CHECKED_IN);
  const dirtyRooms = rooms.filter(r => r.status === RoomStatus.DIRTY);
  const oosRooms = rooms.filter(r => r.status === RoomStatus.OUT_OF_SERVICE);
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID');
  
  const occupancyRate = rooms.length > 0 ? Math.round((activeBookings.length / rooms.length) * 100) : 0;

  // Urgent Items (Red)
  const urgentItems = [
    ...arrivalsToday.filter(b => {
      // Urgent if it's past 15:00 and not checked in (simulated logic)
      return true; 
    }).map(b => ({ type: 'Arrival', title: `${b.customerName} (Unit ${rooms.find(r => r.id === b.roomId)?.number})`, action: 'Check In', view: 'Bookings', id: b.id })),
    ...tickets.filter(t => t.status === 'Open' && t.priority === MaintenancePriority.HIGH).map(t => ({ type: 'Maintenance', title: `High Priority: Unit ${rooms.find(r => r.id === t.roomId)?.number}`, action: 'View', view: 'Maintenance', id: t.id })),
    ...unpaidInvoices.filter(i => i.status === 'DRAFT').map(i => ({ type: 'Finance', title: `Draft Invoice: ${i.customerName}`, action: 'Finalize', view: 'Billing', id: i.id })),
  ];

  // Active Tasks (Blue)
  const activeTasks = [
    ...tasks.filter(t => t.status === 'Pending').map(t => ({ icon: Sparkles, title: `Clean Unit ${rooms.find(r => r.id === t.roomId)?.number}`, subtitle: t.type, time: 'Due Now', view: 'Housekeeping', id: t.id })),
    ...meals.filter(m => m.status === 'Pending').map(m => ({ icon: Utensils, title: `Order: ${m.type}`, subtitle: `Qty: ${m.qty} • ${m.servingLocation}`, time: m.date, view: 'Kitchen', id: m.id })),
  ];

  // Role-based Quick Actions
  const allActions = [
    { label: 'New Booking', icon: Plus, view: 'Bookings', roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF] },
    { label: 'Check In', icon: User, view: 'Bookings', roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF] },
    { label: 'Check Out', icon: LogOut, view: 'Bookings', roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF] },
    { label: 'Create Invoice', icon: CreditCard, view: 'Billing', roles: [UserRole.ADMIN, UserRole.FINANCE] },
    { label: 'Log Ticket', icon: AlertCircle, view: 'Maintenance', roles: [UserRole.ADMIN, UserRole.HOUSEKEEPING, UserRole.BOOKING_STAFF, UserRole.KITCHEN] },
    { label: 'Meal Order', icon: Utensils, view: 'Bookings', roles: [UserRole.ADMIN, UserRole.KITCHEN, UserRole.BOOKING_STAFF] },
  ];
  const availableActions = allActions.filter(action => action.roles.includes(userRole));

  return (
    <div className="max-w-[1920px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* 1) KPI RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Occupancy" value={`${occupancyRate}%`} sub="Today" icon={Bed} onClick={() => onNavigate('Rooms')} color="blue" />
        <KPICard label="Arrivals" value={arrivalsToday.length} sub="Pending" icon={LogIn} onClick={() => onNavigate('Bookings')} color="emerald" />
        <KPICard label="Departures" value={departuresToday.length} sub="Pending" icon={LogOut} onClick={() => onNavigate('Bookings')} color="amber" />
        <KPICard label="Dirty Units" value={dirtyRooms.length} sub="To Clean" icon={Sparkles} onClick={() => onNavigate('Housekeeping')} color="indigo" />
        <KPICard label="Out of Order" value={oosRooms.length} sub="Maintenance" icon={AlertTriangle} onClick={() => onNavigate('Rooms')} color="rose" />
        <KPICard label="Open Balance" value={unpaidInvoices.length} sub="Invoices" icon={CreditCard} onClick={() => onNavigate('Billing')} color="slate" />
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        
        {/* 2) MAIN OPERATIONAL STREAM (Left Column) */}
        <div className="flex-1 w-full space-y-8">
          
          {/* A. PRIORITY ALERTS */}
          {urgentItems.length > 0 ? (
            <Card className="border-l-4 border-l-rose-500 shadow-lg bg-white overflow-hidden">
              <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertCircle size={18} />
                  <Text size="sm" weight="bold" className="uppercase tracking-widest">Needs Attention</Text>
                </div>
                <Badge className="bg-rose-200 text-rose-800 border-none px-2">{urgentItems.length}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {urgentItems.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <Badge variant="outline" className="bg-white border-slate-200 text-[10px] uppercase font-bold w-20 justify-center">{item.type}</Badge>
                       <Text size="sm" weight="medium" className="text-slate-700">{item.title}</Text>
                    </div>
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs uppercase tracking-wide gap-2" onClick={() => onNavigate(item.view)}>
                      {item.action} <ArrowRight size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="bg-emerald-50/50 border-emerald-100 border-dashed border-2 p-6 flex items-center justify-center gap-3 opacity-80">
              <CheckCircle2 className="text-emerald-500" />
              <Text size="sm" weight="medium" className="text-emerald-700">All systems operational. No urgent alerts.</Text>
            </Card>
          )}

          {/* B. DAILY MANIFEST (Arrivals & Departures) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Arrivals */}
             <Card className="bg-white shadow-sm border-slate-200 h-full">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-2">
                   <LogIn size={16} className="text-emerald-600" />
                   <Text size="sm" weight="bold" className="uppercase tracking-widest text-slate-700">Arrivals Today</Text>
                 </div>
                 <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-600">{arrivalsToday.length}</Badge>
               </div>
               <div className="divide-y divide-slate-50 min-h-[200px]">
                 {arrivalsToday.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 italic text-sm">No pending arrivals</div>
                 ) : (
                   arrivalsToday.map(b => (
                     <div key={b.id} className="p-4 hover:bg-slate-50 group transition-colors">
                       <div className="flex justify-between items-start mb-1">
                         <Text size="sm" weight="bold" className="text-slate-800">{b.customerName}</Text>
                         <Text size="xs" muted className="font-mono">15:00</Text>
                       </div>
                       <div className="flex justify-between items-end">
                         <div className="flex flex-col gap-1">
                            <Text size="xs" muted>Unit {rooms.find(r => r.id === b.roomId)?.number} • {b.guestCount} Guests</Text>
                            {b.status === BookingStatus.CONFIRMED && <Badge className="w-fit text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-none">Confirmed</Badge>}
                         </div>
                         <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-[10px] uppercase font-bold" onClick={() => onNavigate('Bookings')}>Check In</Button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </Card>

             {/* Departures */}
             <Card className="bg-white shadow-sm border-slate-200 h-full">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-2">
                   <LogOut size={16} className="text-amber-600" />
                   <Text size="sm" weight="bold" className="uppercase tracking-widest text-slate-700">Departures Today</Text>
                 </div>
                 <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-600">{departuresToday.length}</Badge>
               </div>
               <div className="divide-y divide-slate-50 min-h-[200px]">
                 {departuresToday.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 italic text-sm">No pending departures</div>
                 ) : (
                   departuresToday.map(b => (
                     <div key={b.id} className="p-4 hover:bg-slate-50 group transition-colors">
                       <div className="flex justify-between items-start mb-1">
                         <Text size="sm" weight="bold" className="text-slate-800">{b.customerName}</Text>
                         <Text size="xs" muted className="font-mono">11:00</Text>
                       </div>
                       <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                            <Text size="xs" muted>Unit {rooms.find(r => r.id === b.roomId)?.number}</Text>
                            <Badge className="w-fit text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 border-none">Due Out</Badge>
                          </div>
                          <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-[10px] uppercase font-bold" onClick={() => onNavigate('Bookings')}>Check Out</Button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </Card>
          </div>

          {/* C. ACTIVE OPERATIONS */}
          <Card className="bg-white shadow-sm border-slate-200">
             <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <Text size="sm" weight="bold" className="uppercase tracking-widest text-slate-700">Active Task Queue</Text>
                <Badge variant="secondary">{activeTasks.length} Active</Badge>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {activeTasks.length === 0 ? (
                  <div className="col-span-full text-center p-8 text-slate-400 italic text-sm">No active operational tasks</div>
                ) : (
                  activeTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer" onClick={() => onNavigate(task.view)}>
                       <div className="p-2 bg-slate-100 rounded-md text-slate-500">
                         <task.icon size={16} />
                       </div>
                       <div className="min-w-0">
                          <Text size="sm" weight="bold" className="truncate">{task.title}</Text>
                          <Text size="xs" muted className="truncate">{task.subtitle}</Text>
                          <div className="mt-2 flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600">
                             <Clock size={10} /> {task.time}
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </Card>

        </div>

        {/* 3) SIDEBAR CONTROL PANEL (Right Column) */}
        <div className="w-full xl:w-96 space-y-8 flex-shrink-0">
          
          {/* Quick Actions */}
          <Card className="p-0 overflow-hidden shadow-sm border-slate-200">
            <div className="p-4 bg-slate-900 text-white">
               <Text size="sm" weight="bold" className="uppercase tracking-widest">Quick Actions</Text>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 bg-white">
              {availableActions.map((action, idx) => (
                <button 
                  key={idx}
                  onClick={() => onNavigate(action.view)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <action.icon size={20} className="text-slate-500 group-hover:text-blue-600 mb-2 transition-colors" />
                  <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 uppercase tracking-wide text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Night Audit */}
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Moon size={18} className="text-indigo-600" />
                <Text size="sm" weight="bold" className="uppercase tracking-widest text-slate-800">Night Audit</Text>
              </div>
              <Badge variant="outline" className="border-indigo-100 bg-indigo-50 text-indigo-700">
                 {lastAudit ? 'Run Complete' : 'Pending'}
              </Badge>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                 <span className="text-slate-500">Last Execution</span>
                 <span className="font-mono font-medium">{lastAudit ? lastAudit.date : 'N/A'}</span>
               </div>
               <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                 <span className="text-slate-500">Revenue Posted</span>
                 <span className="font-mono font-medium">NOK {lastAudit?.totalRevenue.toLocaleString() ?? 0}</span>
               </div>
               {userRole === UserRole.ADMIN && (
                 <Button className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200" onClick={() => store.runNightAudit('Admin')}>
                   Execute Audit
                 </Button>
               )}
            </div>
          </Card>

          {/* System Status */}
          {userRole === UserRole.ADMIN && (
            <Card className="p-5 border-slate-200 shadow-sm bg-slate-50">
               <Text size="xs" weight="bold" className="uppercase tracking-widest text-slate-400 mb-4">System Health</Text>
               <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2 text-slate-600"><Activity size={14} /> <span>API Latency</span></div>
                     <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">24ms</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2 text-slate-600"><Server size={14} /> <span>ERP Sync</span></div>
                     <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Connected</Badge>
                  </div>
               </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const KPICard = ({ label, value, sub, icon: Icon, onClick, color }: any) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 border-l-blue-500',
    emerald: 'text-emerald-600 border-l-emerald-500',
    amber: 'text-amber-600 border-l-amber-500',
    indigo: 'text-indigo-600 border-l-indigo-500',
    rose: 'text-rose-600 border-l-rose-500',
    slate: 'text-slate-600 border-l-slate-500',
  };
  const colorClass = colorMap[color] || colorMap.blue;

  return (
    <Card className={`p-5 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all border-l-[4px] bg-white ${colorClass.split(' ')[1]}`} onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Text size="xs" muted className="uppercase tracking-widest font-bold opacity-70">{label}</Text>
          <Text size="3xl" weight="black" className="tracking-tight leading-none text-slate-900">{value}</Text>
          <Text size="xs" weight="medium" className="text-slate-400">{sub}</Text>
        </div>
        <div className={`p-3 rounded-xl bg-slate-50 ${colorClass.split(' ')[0]}`}>
           <Icon size={20} />
        </div>
      </div>
    </Card>
  );
};
