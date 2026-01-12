
import React, { useState, useMemo } from 'react';
import { ApplicationShell, Button, Text, Card } from './components/XalaUI';
import { 
  RoomsView, 
  BookingView, 
  KitchenView, 
  BillingView,
  HousekeepingView,
  MaintenanceView,
  ReportingView,
  AuditLogView
} from './components/Views';
import { AIAssistant } from './components/AIAssistant';
import { 
  LayoutDashboard, 
  Bed, 
  Utensils, 
  CreditCard, 
  Wrench, 
  PieChart, 
  Moon,
  Activity,
  ClipboardList,
  History
} from 'lucide-react';
import { UserRole, BookingStatus } from './types';
import { store } from './services/storeService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);

  // Derived stats for the Control Center
  const stats = useMemo(() => {
    const rooms = store.getRooms();
    const bookings = store.getBookings();
    const activeRooms = bookings.filter(b => b.status === BookingStatus.CHECKED_IN).length;
    
    return {
      occupancy: rooms.length > 0 ? Math.round((activeRooms / rooms.length) * 100) : 0,
      kitchenPending: store.getMeals().filter(m => m.status === 'Pending').length,
      housekeepingPending: store.getHousekeepingTasks().filter(t => t.status === 'Pending').length,
      ticketsOpen: store.getTickets().filter(t => t.status === 'Open').length
    };
  }, [activeTab, userRole]); // Re-calculate when view or role changes

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF] },
    { name: 'Rooms', icon: <Bed size={20} />, roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF, UserRole.HOUSEKEEPING] },
    { name: 'Bookings', icon: <PieChart size={20} />, roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF] },
    { name: 'Housekeeping', icon: <ClipboardList size={20} />, roles: [UserRole.ADMIN, UserRole.HOUSEKEEPING] },
    { name: 'Kitchen', icon: <Utensils size={20} />, roles: [UserRole.ADMIN, UserRole.KITCHEN] },
    { name: 'Billing', icon: <CreditCard size={20} />, roles: [UserRole.ADMIN, UserRole.FINANCE] },
    { name: 'Maintenance', icon: <Wrench size={20} />, roles: [UserRole.ADMIN, UserRole.HOUSEKEEPING] },
    { name: 'Audit Logs', icon: <History size={20} />, roles: [UserRole.ADMIN] },
    { name: 'Reports', icon: <Activity size={20} />, roles: [UserRole.ADMIN, UserRole.FINANCE] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  const renderContent = () => {
    switch (activeTab) {
      case 'Rooms': return <RoomsView />;
      case 'Bookings': return <BookingView />;
      case 'Housekeeping': return <HousekeepingView />;
      case 'Kitchen': return <KitchenView />;
      case 'Billing': return <BillingView />;
      case 'Maintenance': return <MaintenanceView />;
      case 'Audit Logs': return <AuditLogView />;
      case 'Reports': return <ReportingView />;
      default: return (
        <div className="space-y-10">
           <div className="flex justify-between items-center">
             <Text size="2xl" weight="bold" className="tracking-tight">Control Center</Text>
             <Button variant="outline" size="md" className="font-bold tracking-tight border-2" onClick={() => {
               const audit = store.runNightAudit('Manual-Admin');
               alert(`System wide night audit completed. Target Date: ${audit.date}`);
             }}>
               <Moon className="mr-3 h-5 w-5" /> Execute Night Audit
             </Button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             <DashboardStat label="Occupancy Rate" value={`${stats.occupancy}%`} sub="Real-time check-ins" trend="stable" />
             <DashboardStat label="Kitchen Queue" value={stats.kitchenPending} sub="Orders preparing" trend="active" />
             <DashboardStat label="Sanitation" value={stats.housekeepingPending} sub="Units requiring attention" trend="warning" />
             <DashboardStat label="System Faults" value={stats.ticketsOpen} sub="Active tickets" trend="destructive" />
           </div>

           <BookingView />
        </div>
      );
    }
  };

  return (
    <ApplicationShell 
      appName="Digilist" 
      user={{ avatar: 'https://i.pravatar.cc/150?u=digilist' }}
      userRole={userRole}
      onRoleChange={(role) => setUserRole(role as UserRole)}
      availableRoles={Object.values(UserRole)}
      onLogoClick={() => setActiveTab('Dashboard')}
    >
      <div className="flex flex-col md:flex-row gap-12">
        <aside className="hidden md:block w-64 shrink-0 space-y-2">
          <Text size="sm" weight="bold" muted className="px-4 py-3 uppercase tracking-widest opacity-60">Operations</Text>
          {filteredMenu.map(item => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-bold transition-all ${activeTab === item.name ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
            >
              {item.icon}
              {item.name}
            </button>
          ))}
          
          <div className="pt-10 border-t mt-6 border-dashed border-primary/20">
            <Text size="xs" muted className="px-4 italic leading-relaxed">
              Operational profile: <span className="text-primary font-bold">{userRole}</span>
            </Text>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {renderContent()}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
};

const DashboardStat = ({ label, value, sub, trend }: { label: string, value: string | number, sub: string, trend: string }) => {
  const trendColor = {
    stable: 'bg-primary/5 border-primary/20 ring-primary/5',
    active: 'bg-blue-500/5 border-blue-500/20 ring-blue-500/5',
    warning: 'bg-orange-500/5 border-orange-500/20 ring-orange-500/5',
    destructive: 'bg-destructive/5 border-destructive/20 ring-destructive/5'
  }[trend as 'stable' | 'active' | 'warning' | 'destructive'];

  return (
    <Card className={`p-8 ${trendColor} border shadow-none ring-1 transition-transform hover:scale-[1.02]`}>
       <Text weight="bold" size="xs" muted className="mb-4 uppercase tracking-widest opacity-90">{label}</Text>
       <Text size="3xl" weight="bold" className="mb-2 tracking-tighter">{value}</Text>
       <Text size="xs" weight="bold" muted className="opacity-80">{sub}</Text>
    </Card>
  );
}

export default App;
