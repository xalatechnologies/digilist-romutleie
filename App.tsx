
import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApplicationShell, Button, Text, Card } from './components/XalaUI';
import { Dashboard } from './components/Dashboard';
import { 
  RoomsView, 
  BookingView, 
  KitchenView,
  KitchenBoardView,
  MealOrdersView,
  KitchenItemsView,
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
  History,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  User,
  Shield,
  ChevronLeft
} from 'lucide-react';
import { UserRole, BookingStatus, MealOrderStatus, MaintenanceTicketStatus } from './types';
import { store } from './services/storeService';
import { useRequestContext } from './contexts/RequestContext';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { context: requestContext, setContext } = useRequestContext();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  
  // Sync userRole state with request context
  React.useEffect(() => {
    setContext({
      userId: userRole === UserRole.ADMIN ? 'admin' : `user-${userRole.toLowerCase()}`,
      roles: [userRole]
    });
  }, [userRole, setContext]);
  const [openBookingForm, setOpenBookingForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Derived stats for the Control Center
  const stats = useMemo(() => {
    const rooms = store.getRooms();
    const bookings = store.getBookings();
    const activeRooms = bookings.filter(b => b.status === BookingStatus.CHECKED_IN).length;
    
    return {
      occupancy: rooms.length > 0 ? Math.round((activeRooms / rooms.length) * 100) : 0,
      kitchenPending: store.getMeals().filter(m => m.status === MealOrderStatus.PLANNED || m.status === MealOrderStatus.IN_PREP || m.status === MealOrderStatus.READY).length,
      housekeepingPending: store.getHousekeepingTasks().filter(t => t.status === 'Pending').length,
      ticketsOpen: store.getTickets().filter(t => t.status === MaintenanceTicketStatus.OPEN || t.status === MaintenanceTicketStatus.IN_PROGRESS || t.status === MaintenanceTicketStatus.TRIAGED).length
    };
  }, [activeTab, userRole]); // Re-calculate when view or role changes

  const menuGroups = [
    {
      label: t('navigation.overview'),
      items: [
        { key: 'Dashboard', name: t('navigation.dashboard'), icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF], badge: null },
      ]
    },
    {
      label: t('navigation.operations'),
      items: [
        { key: 'Rooms', name: t('navigation.rooms'), icon: Bed, roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF, UserRole.HOUSEKEEPING], badge: null },
        { key: 'Bookings', name: t('navigation.bookings'), icon: PieChart, roles: [UserRole.ADMIN, UserRole.BOOKING_STAFF], badge: null },
        { key: 'Housekeeping', name: t('navigation.housekeeping'), icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.HOUSEKEEPING], badge: stats.housekeepingPending > 0 ? stats.housekeepingPending : null },
        { key: 'Kitchen', name: t('navigation.kitchen'), icon: Utensils, roles: [UserRole.ADMIN, UserRole.KITCHEN], badge: stats.kitchenPending > 0 ? stats.kitchenPending : null },
        { key: 'Maintenance', name: t('navigation.maintenance'), icon: Wrench, roles: [UserRole.ADMIN, UserRole.HOUSEKEEPING], badge: stats.ticketsOpen > 0 ? stats.ticketsOpen : null },
      ]
    },
    {
      label: t('navigation.financeReports'),
      items: [
        { key: 'Billing', name: t('navigation.billing'), icon: CreditCard, roles: [UserRole.ADMIN, UserRole.FINANCE], badge: null },
        { key: 'Reports', name: t('navigation.reports'), icon: Activity, roles: [UserRole.ADMIN, UserRole.FINANCE], badge: null },
      ]
    },
    {
      label: t('navigation.system'),
      items: [
        { key: 'Audit Logs', name: t('navigation.auditLogs'), icon: History, roles: [UserRole.ADMIN], badge: null },
      ]
    }
  ];

  // Flat menu items for backward compatibility
  const menuItems = menuGroups.flatMap(group => group.items.map(item => ({
    ...item,
    icon: <item.icon size={20} />
  })));

  const filteredMenu = useMemo(() => 
    menuItems.filter(item => item.roles.includes(userRole)), 
    [userRole]
  );

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Reset form open state when switching tabs
    if (tab !== 'Bookings') {
      setOpenBookingForm(false);
    }
  }, []);

  const handleNewReservationClick = useCallback(() => {
    setActiveTab('Bookings');
    setOpenBookingForm(true);
  }, []);

  const handleNightAudit = useCallback(() => {
    const audit = store.runNightAudit('Manual-Admin');
    alert(`System wide night audit completed. Target Date: ${audit.date}`);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'Rooms': return <RoomsView />;
      case 'Bookings': return <BookingView autoOpenForm={openBookingForm} onFormOpened={() => setOpenBookingForm(false)} />;
      case 'Housekeeping': return <HousekeepingView userRole={userRole} />;
      case 'Kitchen': return <KitchenView userRole={userRole} />;
      case 'Billing': return <BillingView userRole={userRole} />;
      case 'Maintenance': return <MaintenanceView userRole={userRole} />;
      case 'Audit Logs': return <AuditLogView />;
      case 'Reports': return <ReportingView userRole={userRole} />;
      case 'Dashboard':
      default: return (
        <Dashboard userRole={userRole} onNavigate={setActiveTab} />
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
      sidebarOpen={sidebarOpen}
      onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
    >
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 rounded-token-full shadow-token-lg h-12 w-12 sm:h-14 sm:w-14 bg-primary text-primary-foreground border-0 hover:bg-primary/90 touch-manipulation"
            style={{ zIndex: 'var(--z-fixed)' }}
          >
            {mobileMenuOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
          </Button>
        </div>

        {/* Mobile Menu Overlay - Enhanced */}
        {mobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
            style={{ zIndex: 'var(--z-modal-backdrop)' }}
          >
            <div 
              className="mobile-menu-panel absolute right-0 top-0 h-full w-full sm:w-80 bg-card border-l border-border shadow-token-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ zIndex: 'var(--z-modal)' }}
            >
              {/* Mobile Header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-token-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <Text size="base" weight="bold" className="sm:text-lg">{t('navigation.overview')}</Text>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="h-10 w-10 sm:h-11 sm:w-11 touch-manipulation rounded-token-full hover:bg-muted">
                  <X size={18} className="sm:w-5 sm:h-5" />
                </Button>
                </div>
              </div>
              
              {/* Mobile Navigation */}
              <div className="p-4 sm:p-6 space-y-5">
                {menuGroups.map((group) => {
                  const filteredGroupItems = group.items.filter(item => item.roles.includes(userRole));
                  if (filteredGroupItems.length === 0) return null;
                  
                  return (
                    <div key={group.label}>
                      <div className="px-2 py-1.5 mb-2">
                        <Text size="xs" weight="bold" muted className="uppercase tracking-[0.15em] opacity-50 text-[10px]">
                          {group.label}
                        </Text>
              </div>
              <nav className="space-y-1">
                        {filteredGroupItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.key;
                          
                          return (
                  <button
                    key={item.key}
                    onClick={() => {
                      handleTabChange(item.key);
                      setMobileMenuOpen(false);
                    }}
                              className={`group w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-token-xl text-sm font-medium transition-all duration-200 touch-manipulation min-h-[52px] relative overflow-hidden ${
                                isActive 
                                  ? 'bg-primary text-primary-foreground shadow-token-md' 
                                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted'
                              }`}
                            >
                              {/* Active indicator */}
                              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ${
                                isActive ? 'h-7 bg-primary-foreground/30' : 'h-0'
                              }`} />
                              
                              {/* Icon */}
                              <div className={`flex items-center justify-center w-9 h-9 rounded-token-lg transition-all duration-200 ${
                                isActive 
                                  ? 'bg-primary-foreground/15' 
                                  : 'bg-muted/50'
                              }`}>
                                <Icon size={18} />
                              </div>
                              
                              {/* Label */}
                              <span className="flex-1 text-left">{item.name}</span>
                              
                              {/* Badge */}
                              {item.badge && (
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-token-full ${
                                  isActive 
                                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                                    : 'bg-destructive/10 text-destructive'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              
                              <ChevronRight size={16} className={`transition-all duration-200 ${
                                isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
                              }`} />
                  </button>
                          );
                        })}
              </nav>
                    </div>
                  );
                })}
              </div>
              
              {/* Mobile Profile Section */}
              <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border/50 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-token-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-token-sm">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card" />
                  </div>
                  <div className="flex-1">
                    <Text size="sm" weight="bold">{t('common.admin', 'Administrator')}</Text>
                    <div className="flex items-center gap-1.5">
                      <Shield size={11} className="text-primary" />
                      <Text size="xs" className="text-primary font-semibold uppercase tracking-wide text-[10px]">
                        {userRole.replace('_', ' ')}
                  </Text>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded-token-lg px-3 py-2.5 text-center">
                    <Text size="lg" weight="bold" className="text-primary">{stats.occupancy}%</Text>
                    <Text size="xs" muted className="text-[9px] uppercase tracking-wider opacity-70">{t('dashboard.occupancy')}</Text>
                  </div>
                  <div className="bg-muted/50 rounded-token-lg px-3 py-2.5 text-center">
                    <Text size="lg" weight="bold" className="text-info">{stats.kitchenPending + stats.housekeepingPending}</Text>
                    <Text size="xs" muted className="text-[9px] uppercase tracking-wider opacity-70">{t('dashboard.pending')}</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar Navigation - Fixed Position */}
        <aside 
          className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-64 xl:w-72' : 'w-0'
          }`}
        >
          <div 
            className={`fixed top-16 left-0 bottom-0 bg-card border-r border-border overflow-hidden transition-all duration-300 ease-in-out ${
              sidebarOpen ? 'w-64 xl:w-72 translate-x-0' : 'w-64 xl:w-72 -translate-x-full'
            }`}
            style={{ zIndex: 40 }}
          >
            <div className="h-full overflow-y-auto p-3 xl:p-4">
              {/* Navigation Groups */}
              <div className="space-y-4">
                {menuGroups.map((group, groupIndex) => {
                  const filteredGroupItems = group.items.filter(item => item.roles.includes(userRole));
                  if (filteredGroupItems.length === 0) return null;
                  
                  return (
                    <div key={group.label} className="nav-group">
                      <div className="px-2 xl:px-3 py-1.5 mb-1">
                        <Text size="xs" weight="bold" muted className="uppercase tracking-[0.15em] opacity-50 text-[10px] xl:text-[11px]">
                          {group.label}
                        </Text>
            </div>
                      <nav className="space-y-0.5">
                        {filteredGroupItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.key;
                          
                          return (
                <button
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                              className={`nav-item group w-full flex items-center gap-2.5 xl:gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-token-xl text-xs xl:text-sm font-medium transition-all duration-200 touch-manipulation relative overflow-hidden ${
                                isActive 
                                  ? 'bg-primary text-primary-foreground shadow-token-md' 
                                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                              }`}
                            >
                              {/* Active indicator line */}
                              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ${
                                isActive ? 'h-6 bg-primary-foreground/30' : 'h-0 bg-primary'
                              }`} />
                              
                              {/* Icon container */}
                              <div className={`relative flex items-center justify-center w-8 h-8 rounded-token-lg transition-all duration-200 ${
                                isActive 
                                  ? 'bg-primary-foreground/15' 
                                  : 'bg-muted/50 group-hover:bg-primary/10 group-hover:scale-105'
                              }`}>
                                <Icon size={16} className={`transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                              </div>
                              
                              {/* Label */}
                              <span className="flex-1 text-left truncate">{item.name}</span>
                              
                              {/* Badge */}
                              {item.badge && (
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-token-full ${
                                  isActive 
                                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                                    : 'bg-destructive/10 text-destructive'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              
                              {/* Chevron for active */}
                              <ChevronRight size={14} className={`transition-all duration-200 ${
                                isActive 
                                  ? 'opacity-60 translate-x-0' 
                                  : 'opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0'
                              }`} />
                </button>
                          );
                        })}
            </nav>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}`}>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {renderContent()}
          </div>
        </div>
      </div>
    </ApplicationShell>
  );
};


export default App;
