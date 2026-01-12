
import React, { useState, useEffect, useMemo } from 'react';
import { 
  store 
} from '../services/storeService';
import { integrations } from '../services/integrationService';
import { generateDailyBriefing } from '../services/geminiService';
import { 
  Card, Text, Button, Badge, Stack, Input, Modal 
} from './XalaUI';
import { 
  Bed, Utensils, Wrench, FileText, ClipboardList, CheckCircle2, AlertTriangle, Send,
  Plus, Trash2, Download, PieChart, TrendingUp, Sparkles, Loader2, Calendar, User, Info, XCircle, Search as SearchIcon, 
  Clock, MapPin, HardHat, Link as LinkIcon, Copy, ExternalLink, QrCode, Building2, UserCircle, Briefcase, CreditCard, ChevronDown, ChevronRight, ChevronLeft,
  ShieldCheck, ArrowRight, Save, X, Moon
} from 'lucide-react';
import { 
  RoomStatus, BookingStatus, IKitchenItem, IHousekeepingTask, RoomType, MaintenancePriority, 
  IRoom, IInvoice, IBooking, IMaintenanceTicket, IPayment, CustomerType, PaymentMethod, IExtraFee, IMealOrder 
} from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

// --- PAYMENT LINK MODAL ---
const PaymentLinkModal: React.FC<{
  payment: IPayment;
  isOpen: boolean;
  onClose: () => void;
}> = ({ payment, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (payment.paymentLink) {
      navigator.clipboard.writeText(payment.paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Secure Payment Link">
      <Stack spacing={8} className="py-4">
        <div className="flex flex-col items-center justify-center p-8 bg-primary/5 border border-primary/20 rounded-2xl border-dashed">
          <QrCode size={120} className="text-primary mb-6 opacity-80" />
          <Text size="sm" weight="bold" muted className="uppercase tracking-widest text-center">Scan to pay now</Text>
        </div>
        <div className="space-y-3">
          <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Digital Checkout URL</Text>
          <div className="flex gap-2">
            <div className="flex-1 p-4 bg-muted/30 rounded-lg border font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
              {payment.paymentLink}
            </div>
            <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 h-12 w-12 border-2">
              {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 font-bold h-12" onClick={onClose}>Close</Button>
          <Button className="flex-1 font-bold h-12 gap-2" onClick={() => window.open(payment.paymentLink, '_blank')}>
            <ExternalLink size={18} /> Open Preview
          </Button>
        </div>
      </Stack>
    </Modal>
  );
};

// --- BOOKING VIEW ---
export const BookingView = () => {
  const [bookings, setBookings] = useState(store.getBookings());
  const [showAdd, setShowAdd] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rooms] = useState(store.getRooms());
  const [kitchenItems] = useState(store.getKitchenItems());
  
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

  const steps = [
    { title: 'Identity', icon: <UserCircle size={18} /> },
    { title: 'Stay', icon: <Calendar size={18} /> },
    { title: 'Mode', icon: <Briefcase size={18} /> },
    { title: 'Financial', icon: <CreditCard size={18} /> },
    { title: 'Orders', icon: <Utensils size={18} /> },
    { title: 'Confirm', icon: <ShieldCheck size={18} /> }
  ];

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => r.type === form.roomType);
  }, [rooms, form.roomType]);

  const availableRooms = useMemo(() => {
    if (!form.startDate || !form.endDate) return [];
    if (new Date(form.startDate) >= new Date(form.endDate)) return [];
    return filteredRooms.filter(room => store.isRoomAvailable(room.id, form.startDate, form.endDate));
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
      setBookings(store.getBookings());
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
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <Stack spacing={1}>
          <Text size="xl" weight="bold" className="text-foreground tracking-tight">Reservations Ledger</Text>
          <Text size="sm" muted>Enterprise hospitality management & audit trail</Text>
        </Stack>
        {!showAdd && (
          <Button onClick={() => { setShowAdd(true); setCurrentStep(0); }} className="gap-3 h-12 px-6 shadow-md hover:shadow-lg transition-all">
            <Plus size={20} />
            New Reservation
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="space-y-10 max-w-7xl mx-auto">
          {/* Top Horizontal Progress - Number Ticket Style */}
          <Card className="p-8 bg-white shadow-xl border-none relative overflow-hidden">
             <div className="flex items-center justify-between w-full max-w-5xl mx-auto relative z-10">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    <div className="relative flex items-center justify-center w-full mb-3">
                      {/* Connector Line */}
                      {idx < steps.length - 1 && (
                        <div className={`absolute top-1/2 left-1/2 w-full h-[3px] -translate-y-1/2 transition-all duration-500 rounded-full ${currentStep > idx ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                      
                      {/* Ticket Circle */}
                      <button 
                        onClick={() => { if (idx <= currentStep || isStepValid) setCurrentStep(idx); }}
                        className={`relative z-20 w-14 h-14 rounded-full flex items-center justify-center font-black text-lg transition-all duration-300 border-4 ${
                          currentStep === idx 
                            ? 'bg-primary text-white border-primary shadow-[0_0_25px_rgba(var(--primary),0.3)] scale-110' 
                            : currentStep > idx 
                              ? 'bg-green-500 text-white border-green-500' 
                              : 'bg-white text-muted-foreground border-muted'
                        }`}
                      >
                        {currentStep > idx ? <CheckCircle2 size={24} /> : (idx + 1)}
                      </button>
                    </div>
                    <Text 
                      size="xs" 
                      weight={currentStep === idx ? 'bold' : 'medium'} 
                      className={`uppercase tracking-widest text-[10px] transition-colors ${currentStep === idx ? 'text-primary' : 'text-muted-foreground opacity-50'}`}
                    >
                      {step.title}
                    </Text>
                  </div>
                ))}
             </div>
             
             {/* Decorative UI elements */}
             <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40 opacity-30" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl -ml-32 -mb-32 opacity-30" />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Step Content */}
            <div className="lg:col-span-3 space-y-8 animate-in slide-in-from-bottom-6 duration-500">
              
              {/* STEP 1: IDENTITY */}
              {currentStep === 0 && (
                <Card className="p-10 shadow-lg border-none bg-white">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <UserCircle size={28} />
                    </div>
                    <Stack spacing={0}>
                      <Text weight="bold" size="xl" className="tracking-tight">1. Customer Identity</Text>
                      <Text size="xs" muted className="uppercase tracking-widest">Billing & Contact Entity</Text>
                    </Stack>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 flex gap-4 bg-muted/30 p-1.5 rounded-2xl border">
                       <Button 
                         variant={form.customerType === CustomerType.PERSON ? 'primary' : 'ghost'} 
                         className="flex-1 rounded-xl h-12 shadow-sm" 
                         onClick={() => setForm({...form, customerType: CustomerType.PERSON})}
                       >Person</Button>
                       <Button 
                         variant={form.customerType === CustomerType.COMPANY ? 'primary' : 'ghost'} 
                         className="flex-1 rounded-xl h-12 shadow-sm" 
                         onClick={() => setForm({...form, customerType: CustomerType.COMPANY})}
                       >Company</Button>
                    </div>

                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Contact Name *</Text>
                       <Input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="Full name of contact..." />
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Email Address *</Text>
                       <Input value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})} placeholder="email@example.com" />
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Phone Number *</Text>
                       <Input value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="+47 ..." />
                    </div>

                    {form.customerType === CustomerType.COMPANY ? (
                       <>
                         <div className="space-y-3">
                           <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Company Name *</Text>
                           <Input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} placeholder="Entity name..." />
                         </div>
                         <div className="space-y-3">
                           <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Org Number</Text>
                           <Input value={form.orgNumber} onChange={e => setForm({...form, orgNumber: e.target.value})} placeholder="XXX-XXX-XXX" />
                         </div>
                         <div className="space-y-3">
                           <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Billing Address *</Text>
                           <Input value={form.billingAddress} onChange={e => setForm({...form, billingAddress: e.target.value})} placeholder="Street, Zip, City..." />
                         </div>
                         <div className="space-y-3">
                           <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Invoice Reference 1</Text>
                           <Input value={form.reference1} onChange={e => setForm({...form, reference1: e.target.value})} />
                         </div>
                         <div className="space-y-3">
                           <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Invoice Reference 2</Text>
                           <Input value={form.reference2} onChange={e => setForm({...form, reference2: e.target.value})} />
                         </div>
                       </>
                    ) : (
                      <div className="space-y-3">
                         <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Internal Staff Note</Text>
                         <textarea className="w-full h-24 border rounded-xl p-4 text-sm bg-muted/10" value={form.internalNote} onChange={e => setForm({...form, internalNote: e.target.value})} placeholder="Private notes, not on invoice..." />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* STEP 2: STAY */}
              {currentStep === 1 && (
                <Card className="p-10 shadow-lg border-none bg-white">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar size={28} />
                    </div>
                    <Stack spacing={0}>
                      <Text weight="bold" size="xl" className="tracking-tight">2. Stay Details</Text>
                      <Text size="xs" muted className="uppercase tracking-widest">Timeline & Allocation</Text>
                    </Stack>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Arrival Date *</Text>
                       <Input type="date" min={todayDate} value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value, roomId: ''})} />
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Departure Date *</Text>
                       <Input type="date" min={form.startDate || todayDate} value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value, roomId: ''})} />
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Room Type *</Text>
                       <select className="w-full h-11 border rounded-xl px-4 bg-background font-medium" value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value as RoomType, roomId: ''})}>
                         {Object.values(RoomType).map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Preferred Unit *</Text>
                       <select className="w-full h-11 border rounded-xl px-4 bg-background font-medium" value={form.roomId} onChange={e => setForm({...form, roomId: e.target.value})}>
                         <option value="">{availableRooms.length > 0 ? `Select Room (${availableRooms.length} available)` : 'Check availability'}</option>
                         {availableRooms.map(r => <option key={r.id} value={r.id}>Room {r.number} (Deck {r.floor})</option>)}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Guest Count *</Text>
                       <Input type="number" min="1" value={form.guestCount} onChange={e => setForm({...form, guestCount: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Check-In / Check-Out</Text>
                       <div className="flex gap-4">
                         <Input type="time" value={form.checkInTime} onChange={e => setForm({...form, checkInTime: e.target.value})} />
                         <Input type="time" value={form.checkOutTime} onChange={e => setForm({...form, checkOutTime: e.target.value})} />
                       </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* STEP 3: BOOKING MODE */}
              {currentStep === 2 && (
                <Card className="p-10 shadow-lg border-none bg-white">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Briefcase size={28} />
                    </div>
                    <Stack spacing={0}>
                      <Text weight="bold" size="xl" className="tracking-tight">3. Booking Mode</Text>
                      <Text size="xs" muted className="uppercase tracking-widest">Operational behavior</Text>
                    </Stack>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 flex gap-4 bg-muted/30 p-1.5 rounded-2xl border">
                       <Button variant={form.bookingMode === 'Individual' ? 'primary' : 'ghost'} className="flex-1 h-12 rounded-xl shadow-sm" onClick={() => setForm({...form, bookingMode: 'Individual'})}>Individual</Button>
                       <Button variant={form.bookingMode === 'Group' ? 'primary' : 'ghost'} className="flex-1 h-12 rounded-xl shadow-sm" onClick={() => setForm({...form, bookingMode: 'Group'})}>Group</Button>
                    </div>
                    {form.bookingMode === 'Group' && (
                      <div className="space-y-3 md:col-span-2">
                        <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Group / Campaign Name *</Text>
                        <Input value={form.groupName} onChange={e => setForm({...form, groupName: e.target.value})} placeholder="e.g. Summer Tour 2025" />
                      </div>
                    )}
                    <div className="md:col-span-2 space-y-3">
                       <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Operational Notes (Internal)</Text>
                       <textarea className="w-full h-32 border rounded-xl p-4 text-sm bg-muted/10 font-medium" value={form.operationalNotes} onChange={e => setForm({...form, operationalNotes: e.target.value})} placeholder="Kitchen / Cleaning / Reception notes..." />
                    </div>
                  </div>
                </Card>
              )}

              {/* STEP 4: FINANCIALS */}
              {currentStep === 3 && (
                <Stack spacing={8}>
                  <Card className="p-10 shadow-lg border-none bg-white">
                     <div className="flex items-center gap-4 mb-10">
                       <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                         <TrendingUp size={28} />
                       </div>
                       <Stack spacing={0}>
                         <Text weight="bold" size="xl" className="tracking-tight">4. Pricing & Agreements</Text>
                         <Text size="xs" muted className="uppercase tracking-widest">Financial Strategy</Text>
                       </Stack>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Rate Code *</Text>
                          <Input value={form.rateCode} onChange={e => setForm({...form, rateCode: e.target.value})} />
                        </div>
                        <div className="space-y-3">
                          <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Override / Night</Text>
                          <Input type="number" value={form.pricePerNightOverride} onChange={e => setForm({...form, pricePerNightOverride: e.target.value})} />
                        </div>
                        <div className="space-y-3">
                          <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Discount (%)</Text>
                          <Input type="number" value={form.discountPercentage} onChange={e => setForm({...form, discountPercentage: e.target.value})} />
                        </div>
                     </div>
                  </Card>

                  <Card className="p-10 shadow-lg border-none bg-white">
                     <div className="flex items-center gap-4 mb-10">
                       <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                         <CreditCard size={28} />
                       </div>
                       <Stack spacing={0}>
                         <Text weight="bold" size="xl" className="tracking-tight">5. Payment Setup</Text>
                         <Text size="xs" muted className="uppercase tracking-widest">Settlement Logic</Text>
                       </Stack>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Method *</Text>
                          <select className="w-full h-11 border rounded-xl px-4 bg-background font-medium" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as PaymentMethod})}>
                            {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border-2 border-dashed cursor-pointer hover:bg-muted/30 transition-all w-full h-12">
                            <input type="checkbox" className="w-6 h-6 accent-primary" checked={form.cardGuaranteeRequired} onChange={e => setForm({...form, cardGuaranteeRequired: e.target.checked})} />
                            <Text weight="bold" size="sm" className="uppercase tracking-tighter">Guarantee Required</Text>
                          </label>
                        </div>
                        {form.cardGuaranteeRequired && (
                          <div className="md:col-span-2 space-y-3">
                            <Text size="xs" weight="bold" muted className="uppercase tracking-widest">Guarantee ID / Token</Text>
                            <Input value={form.cardGuaranteeRef} onChange={e => setForm({...form, cardGuaranteeRef: e.target.value})} />
                          </div>
                        )}
                     </div>
                  </Card>
                </Stack>
              )}

              {/* STEP 5: ORDERS */}
              {currentStep === 4 && (
                <Card className="p-10 shadow-lg border-none bg-white">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Utensils size={28} />
                      </div>
                      <Stack spacing={0}>
                        <Text weight="bold" size="xl" className="tracking-tight">6. Add-ons & Orders</Text>
                        <Text size="xs" muted className="uppercase tracking-widest">consumption during stay</Text>
                      </Stack>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm" onClick={addMealLine} className="h-10 px-4 text-xs font-bold border-2"><Plus size={16} className="mr-2" /> Catering</Button>
                      <Button variant="outline" size="sm" onClick={() => addFeeLine('Late Check-out', 500)} className="h-10 px-4 text-xs font-bold border-2"><Plus size={16} className="mr-2" /> Add fee</Button>
                    </div>
                  </div>

                  <Stack spacing={6}>
                    {form.meals.map((meal, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-4 p-5 bg-muted/20 rounded-2xl border items-end border-l-8 border-l-primary animate-in fade-in zoom-in-95 duration-200">
                         <div className="space-y-2">
                           <Text size="xs" weight="bold" muted className="uppercase">Catalog Item</Text>
                           <select className="w-full h-10 text-xs border rounded-xl px-3 bg-white font-medium" value={meal.itemId} onChange={e => {
                             const newMeals = [...form.meals];
                             newMeals[idx].itemId = e.target.value;
                             newMeals[idx].type = kitchenItems.find(k => k.id === e.target.value)?.name || 'Meal';
                             setForm({...form, meals: newMeals});
                           }}>
                             {kitchenItems.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                           </select>
                         </div>
                         <div className="space-y-2">
                           <Text size="xs" weight="bold" muted className="uppercase">Serving Date</Text>
                           <Input type="date" className="h-10 text-xs px-3" value={meal.date} onChange={e => {
                              const newMeals = [...form.meals];
                              newMeals[idx].date = e.target.value;
                              setForm({...form, meals: newMeals});
                           }} />
                         </div>
                         <div className="space-y-2">
                           <Text size="xs" weight="bold" muted className="uppercase">Qty</Text>
                           <Input type="number" className="h-10 text-xs px-3" value={meal.qty} onChange={e => {
                              const newMeals = [...form.meals];
                              newMeals[idx].qty = parseInt(e.target.value);
                              setForm({...form, meals: newMeals});
                           }} />
                         </div>
                         <div className="space-y-2">
                           <Text size="xs" weight="bold" muted className="uppercase">Location</Text>
                           <Input className="h-10 text-xs px-3" value={meal.servingLocation} onChange={e => {
                              const newMeals = [...form.meals];
                              newMeals[idx].servingLocation = e.target.value;
                              setForm({...form, meals: newMeals});
                           }} />
                         </div>
                         <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive ml-auto hover:bg-destructive/10" onClick={() => {
                           const newMeals = form.meals.filter((_, i) => i !== idx);
                           setForm({...form, meals: newMeals});
                         }}><Trash2 size={18} /></Button>
                      </div>
                    ))}
                    {form.extraFees.map((fee, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 items-end border-l-8 border-l-blue-400 animate-in fade-in duration-200">
                         <div className="space-y-2 md:col-span-2">
                           <Text size="xs" weight="bold" muted className="uppercase">Fee Description</Text>
                           <Input className="h-10 text-xs px-3 bg-white" value={fee.description} onChange={e => {
                             const newFees = [...form.extraFees];
                             newFees[idx].description = e.target.value;
                             setForm({...form, extraFees: newFees});
                           }} />
                         </div>
                         <div className="space-y-2">
                           <Text size="xs" weight="bold" muted className="uppercase">Amount (NOK)</Text>
                           <Input type="number" className="h-10 text-xs px-3 bg-white" value={fee.amount} onChange={e => {
                              const newFees = [...form.extraFees];
                              newFees[idx].amount = parseFloat(e.target.value);
                              setForm({...form, extraFees: newFees});
                           }} />
                         </div>
                         <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive ml-auto hover:bg-destructive/10" onClick={() => {
                           const newFees = form.extraFees.filter((_, i) => i !== idx);
                           setForm({...form, extraFees: newFees});
                         }}><Trash2 size={18} /></Button>
                      </div>
                    ))}
                    {form.meals.length === 0 && form.extraFees.length === 0 && (
                      <div className="py-20 text-center bg-slate-50/50 border-4 border-dotted rounded-3xl flex flex-col items-center gap-4">
                         <ClipboardList size={48} className="text-muted-foreground/20" />
                         <Text size="sm" muted className="italic font-medium">No catering or extra services orders logged.</Text>
                      </div>
                    )}
                  </Stack>
                </Card>
              )}

              {/* STEP 6: CONFIRM */}
              {currentStep === 5 && (
                <Card className="p-10 shadow-lg border-none bg-white">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldCheck size={28} />
                    </div>
                    <Stack spacing={0}>
                      <Text weight="bold" size="xl" className="tracking-tight">7. Confirmation</Text>
                      <Text size="xs" muted className="uppercase tracking-widest">Final Audit Review</Text>
                    </Stack>
                  </div>
                  <Stack spacing={10}>
                     <div className="grid grid-cols-2 gap-12 border-b pb-12 border-slate-100">
                        <div>
                          <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-4">Customer Entity</Text>
                          <Text weight="bold" size="lg" className="text-primary">{form.customerName}</Text>
                          <Text size="sm" muted className="mt-1 font-medium">{form.customerEmail}</Text>
                          <div className="flex gap-2 mt-4">
                            <Badge variant="secondary" className="px-3">{form.customerType}</Badge>
                            <Badge variant="outline" className="px-3 border-slate-200">{form.paymentMethod}</Badge>
                          </div>
                        </div>
                        <div>
                          <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-4">Stay Allocation</Text>
                          <Text weight="bold" size="lg" className="flex items-center gap-2">Unit {rooms.find(r => r.id === form.roomId)?.number} <ArrowRight size={16} className="text-muted-foreground" /> {form.roomType}</Text>
                          <Text size="sm" muted className="mt-1 font-medium">{form.startDate} to {form.endDate} ({form.guestCount} Guests)</Text>
                          <div className="flex gap-2 mt-4">
                            <Badge variant="outline" className="px-3 border-slate-200">Deck {rooms.find(r => r.id === form.roomId)?.floor}</Badge>
                            <Badge variant="outline" className="px-3 border-slate-200">{form.bookingMode}</Badge>
                          </div>
                        </div>
                     </div>
                     
                     <div className="p-8 bg-green-50/50 border border-green-100 rounded-3xl">
                        <Text size="xs" weight="bold" muted className="uppercase tracking-widest mb-6 text-green-700">Audit Status</Text>
                        <ul className="space-y-4">
                          <li className="flex items-center gap-4 text-sm text-green-800 font-bold"><div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 size={14} /></div> Financial valuation locked</li>
                          <li className="flex items-center gap-4 text-sm text-green-800 font-bold"><div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 size={14} /></div> Inventory availability validated</li>
                          <li className="flex items-center gap-4 text-sm text-green-800 font-bold"><div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 size={14} /></div> VAT mappings resolved</li>
                        </ul>
                     </div>
                  </Stack>
                </Card>
              )}

              {/* Navigation Actions */}
              <div className="flex justify-between items-center pt-8">
                 <div className="flex gap-4">
                   <Button 
                     variant="ghost" 
                     onClick={handleCancel} 
                     className="gap-2 font-bold px-6 text-destructive hover:bg-destructive/10"
                   >
                     <XCircle size={20} /> Discard
                   </Button>
                   <Button 
                     variant="outline" 
                     onClick={handleBack} 
                     disabled={currentStep === 0}
                     className="gap-2 font-bold px-6 border-2"
                   >
                     <ChevronLeft size={20} /> Back
                   </Button>
                 </div>

                 {currentStep < steps.length - 1 ? (
                   <Button 
                      onClick={handleNext} 
                      disabled={!isStepValid}
                      className="gap-3 font-bold h-14 px-12 shadow-xl shadow-primary/20 scale-105 active:scale-95 transition-all"
                   >
                     Continue <ChevronRight size={22} />
                   </Button>
                 ) : (
                   <Button 
                     variant="primary" 
                     onClick={handleCreateBooking}
                     className="gap-3 font-bold h-16 px-16 shadow-2xl shadow-primary/30 scale-110 active:scale-95 transition-all"
                   >
                     Confirm Reservation <Save size={22} />
                   </Button>
                 )}
              </div>
            </div>

            {/* Simplified Quotation Panel - Clean White */}
            <div className="lg:col-span-1">
              <Card className="p-8 sticky top-28 shadow-2xl border-none bg-white text-foreground ring-1 ring-slate-200 rounded-3xl">
                 <Text weight="bold" size="lg" className="mb-10 uppercase tracking-widest border-b border-slate-100 pb-6 text-primary flex items-center justify-between">
                   Quotation
                   <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                 </Text>
                 <Stack spacing={6}>
                    <div className="flex justify-between items-center opacity-70">
                      <Text size="xs" weight="bold" className="uppercase tracking-widest">Unit Stay</Text>
                      <Text weight="bold" size="sm">NOK {getSubTotal().toLocaleString()}</Text>
                    </div>
                    <div className="flex justify-between items-center opacity-70">
                      <Text size="xs" weight="bold" className="uppercase tracking-widest">Add-ons</Text>
                      <Text weight="bold" size="sm">NOK {getAddOnsTotal().toLocaleString()}</Text>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-50 pt-4 opacity-50">
                      <Text size="xs" weight="bold" className="uppercase tracking-widest">VAT</Text>
                      <Text weight="bold" size="xs">NOK {totalVAT.toLocaleString()}</Text>
                    </div>
                    
                    <div className="flex justify-between items-end pt-6">
                      <Text weight="bold" size="lg" className="uppercase tracking-widest text-primary">Total</Text>
                      <div className="text-right">
                         <Text weight="bold" size="4xl" className="tracking-tighter leading-none text-primary">{(getSubTotal() + getAddOnsTotal()).toLocaleString()}</Text>
                         <Text size="xs" weight="bold" className="muted uppercase mt-2 opacity-40 font-black">NOK • INCL. VAT</Text>
                      </div>
                    </div>
                    
                    {!isStepValid && (
                      <div className="mt-10 p-5 bg-orange-50 rounded-2xl flex gap-4 items-start border border-orange-100 shadow-inner">
                         <Info size={20} className="shrink-0 text-orange-500" />
                         <Text size="xs" weight="bold" className="leading-tight text-orange-700 uppercase tracking-tighter">Required data missing for this stage.</Text>
                      </div>
                    )}

                    <div className="mt-12 p-6 bg-muted/20 rounded-2xl border border-slate-100/50">
                      <Text size="xs" weight="bold" className="uppercase mb-4 opacity-30 tracking-widest">Status Indicators</Text>
                      <ul className="space-y-3">
                         <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-green-600"><CheckCircle2 size={14} /> Inventory Locked</li>
                         <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-green-600"><CheckCircle2 size={14} /> VAT Resolved</li>
                         <li className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-green-600"><CheckCircle2 size={14} /> Audit Ready</li>
                      </ul>
                    </div>
                 </Stack>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Existing Reservations Table */}
      {!showAdd && (
        <Card className="overflow-hidden shadow-xl border-none bg-white rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted text-[10px] font-bold border-b uppercase tracking-widest text-muted-foreground/60">
                <tr>
                  <th className="p-8">Client / Entity</th>
                  <th className="p-8">Timeline</th>
                  <th className="p-8">Unit Allocation</th>
                  <th className="p-8">Valuation</th>
                  <th className="p-8">Status</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm font-medium text-slate-700">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-all duration-300">
                    <td className="p-8">
                      <Stack spacing={0}>
                        <Text weight="bold" size="base" className="text-foreground tracking-tight">{b.customerName}</Text>
                        {b.companyName && <Text size="xs" muted className="uppercase font-black tracking-widest text-[9px] opacity-60 mt-0.5">{b.companyName}</Text>}
                      </Stack>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-3 font-bold tracking-tighter text-slate-500">
                         <Calendar size={16} className="opacity-40" />
                         {b.startDate} <ChevronRight size={12} className="opacity-20" /> {b.endDate}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit bg-slate-100 text-slate-700 uppercase font-black text-[9px] tracking-widest">Room {store.getRoomById(b.roomId)?.number}</Badge>
                        <Text size="xs" muted className="font-bold opacity-60">{store.getRoomById(b.roomId)?.type}</Text>
                      </div>
                    </td>
                    <td className="p-8 font-mono font-bold text-primary text-base">NOK {b.totalPrice.toLocaleString()}</td>
                    <td className="p-8">
                      <Badge variant={b.status === BookingStatus.CHECKED_IN ? 'success' : 'outline'} className={`uppercase text-[10px] tracking-widest font-black shadow-sm ${b.status === BookingStatus.CONFIRMED ? 'border-primary/20 bg-primary/5 text-primary' : ''}`}>{b.status}</Badge>
                    </td>
                    <td className="p-8 text-right">
                      <div className="flex justify-end gap-3">
                        {b.status === BookingStatus.CONFIRMED && <Button size="sm" variant="outline" className="h-10 px-5 font-bold rounded-xl border-2 hover:bg-primary hover:text-white transition-all" onClick={() => setBookings(store.updateBookingStatus(b.id, BookingStatus.CHECKED_IN))}>Check In</Button>}
                        {b.status === BookingStatus.CHECKED_IN && <Button size="sm" variant="outline" className="h-10 px-5 font-bold rounded-xl border-2 hover:bg-primary hover:text-white transition-all" onClick={() => setBookings(store.updateBookingStatus(b.id, BookingStatus.CHECKED_OUT))}>Check Out</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-32 text-center">
                      <div className="flex flex-col items-center gap-6 opacity-30 grayscale">
                        <ClipboardList size={80} strokeWidth={1} />
                        <Text size="lg" weight="bold" className="tracking-tight">No active reservation records.</Text>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// --- ROOMS VIEW ---
export const RoomsView = () => {
  const [rooms, setRooms] = useState(store.getRooms());
  const [bookings] = useState(store.getBookings());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const toggleStatus = (id: string, status: RoomStatus) => {
    setRooms(store.updateRoomStatus(id, status));
  };

  const isOccupied = (roomId: string) => {
    return bookings.some(b => b.roomId === roomId && b.status === BookingStatus.CHECKED_IN);
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            room.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchQuery, statusFilter]);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <Stack spacing={1}>
          <Text size="xl" weight="bold">Unit Inventory</Text>
          <Text size="sm" muted>Real-time physical fleet management</Text>
        </Stack>
        <Card className="p-4 bg-muted/30 border-none shadow-sm flex flex-wrap gap-4 items-center rounded-2xl">
          <div className="relative flex-1 min-w-[280px]">
            <SearchIcon className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground opacity-50" />
            <Input placeholder="Filter units by number/type..." className="pl-11 bg-white h-11 border-none shadow-inner rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredRooms.map(room => (
          <Card key={room.id} className="relative p-8 min-h-[240px] flex flex-col justify-between border-none shadow-xl bg-white cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all duration-500 group rounded-3xl" onClick={() => setSelectedRoomId(room.id)}>
            <div>
              <Text weight="bold" size="xl" className="group-hover:text-primary transition-colors tracking-tight">Unit {room.number}</Text>
              <Text size="xs" weight="black" muted className="uppercase tracking-widest mt-2 opacity-50">{room.type}</Text>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <Badge variant={room.status === RoomStatus.CLEAN ? 'success' : 'outline'} className="text-[10px] tracking-widest uppercase font-black px-4 py-1.5">{room.status}</Badge>
                {isOccupied(room.id) && <Badge className="bg-blue-600 text-white text-[10px] uppercase font-black px-4 py-1.5 shadow-md">Occupied</Badge>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {selectedRoom && (
        <Modal isOpen={!!selectedRoomId} onClose={() => setSelectedRoomId(null)} title={`Unit ${selectedRoom.number} Management`}>
           <Stack spacing={8} className="py-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant={selectedRoom.status === RoomStatus.CLEAN ? 'primary' : 'outline'} className="h-14 font-black uppercase text-xs tracking-widest rounded-xl" onClick={() => toggleStatus(selectedRoom.id, RoomStatus.CLEAN)}>Mark CLEAN</Button>
                <Button variant={selectedRoom.status === RoomStatus.DIRTY ? 'primary' : 'outline'} className="h-14 font-black uppercase text-xs tracking-widest rounded-xl" onClick={() => toggleStatus(selectedRoom.id, RoomStatus.DIRTY)}>Mark DIRTY</Button>
                <Button variant={selectedRoom.status === RoomStatus.OUT_OF_SERVICE ? 'destructive' : 'outline'} className="h-14 font-black uppercase text-xs tracking-widest sm:col-span-2 rounded-xl" onClick={() => toggleStatus(selectedRoom.id, RoomStatus.OUT_OF_SERVICE)}>Mark OUT OF SERVICE</Button>
             </div>
             <div className="p-8 bg-muted/40 rounded-3xl space-y-4 border border-slate-100 shadow-inner">
               <Text size="xs" weight="bold" muted className="uppercase tracking-widest opacity-60">Specifications</Text>
               <div className="flex justify-between items-center text-sm">
                 <span className="font-bold opacity-50 uppercase tracking-tighter text-xs">Level / Deck</span>
                 <span className="font-black text-slate-800 tracking-tight">{selectedRoom.floor}</span>
               </div>
               <div className="flex justify-between items-center text-sm border-t border-slate-200/50 pt-3">
                 <span className="font-bold opacity-50 uppercase tracking-tighter text-xs">Capacity</span>
                 <span className="font-black text-slate-800 tracking-tight">{selectedRoom.capacity} PAX</span>
               </div>
               <div className="flex justify-between items-center text-sm border-t border-slate-200/50 pt-3">
                 <span className="font-bold opacity-50 uppercase tracking-tighter text-xs">Daily Valuation</span>
                 <span className="font-black text-primary text-base tracking-tight">NOK {selectedRoom.pricePerNight.toLocaleString()}</span>
               </div>
             </div>
           </Stack>
        </Modal>
      )}
    </div>
  );
};

// --- BILLING VIEW ---
export const BillingView = () => {
  const [invoices, setInvoices] = useState(store.getInvoices());
  const [activePayment, setActivePayment] = useState<IPayment | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleGeneratePaymentLink = async (invoiceId: string) => {
    setIsGenerating(invoiceId);
    await new Promise(r => setTimeout(r, 800));
    const payment = store.createPayment(invoiceId);
    setInvoices([...store.getInvoices()]);
    setActivePayment(payment);
    setIsGenerating(null);
  };

  const pendingBookings = store.getBookings().filter(
    b => b.status === BookingStatus.CHECKED_OUT && !invoices.find(inv => inv.bookingId === b.id)
  );

  return (
    <div className="space-y-8">
      <Stack spacing={1}>
        <Text size="xl" weight="bold">Financial Operations</Text>
        <Text size="sm" muted>Checkout ledger & ERP synchronisation</Text>
      </Stack>
      <Card className="overflow-hidden shadow-2xl border-none rounded-3xl">
        <table className="w-full text-left">
          <thead className="bg-muted text-[10px] font-bold border-b uppercase tracking-widest text-muted-foreground/60">
            <tr><th className="p-8">Invoice ID</th><th className="p-8">Client</th><th className="p-8">Net Amount</th><th className="p-8">Ledger Status</th><th className="p-8 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-8 font-mono font-bold text-primary text-base">{inv.id}</td>
                <td className="p-8"><Text weight="bold" size="sm">{inv.customerName}</Text></td>
                <td className="p-8 font-bold text-base">NOK {inv.amount.toLocaleString()}</td>
                <td className="p-8"><Badge variant={inv.status === 'PAID' ? 'success' : 'outline'} className="text-[10px] uppercase font-black px-4 py-1.5">{inv.status}</Badge></td>
                <td className="p-8 text-right">
                  <div className="flex justify-end gap-3">
                    {inv.status === 'DRAFT' && (
                      <Button variant="primary" size="sm" className="h-10 px-6 text-xs font-bold rounded-xl" onClick={() => handleGeneratePaymentLink(inv.id)} disabled={isGenerating === inv.id}>
                        {isGenerating === inv.id ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={14} className="mr-2" />} Create link
                      </Button>
                    )}
                    {inv.paymentId && <Button variant="outline" size="sm" className="h-10 px-6 text-xs font-bold rounded-xl border-2" onClick={() => setActivePayment(store.getPayments().find(p => p.id === inv.paymentId) || null)}>Audit Payment</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {pendingBookings.map(b => (
        <Card key={b.id} className="p-10 flex justify-between items-center border-dashed border-4 bg-primary/5 border-primary/20 rounded-3xl animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-primary text-white flex items-center justify-center shadow-xl">
              <ClipboardList size={32} />
            </div>
            <div>
              <Text weight="bold" size="xl" className="tracking-tight">{b.customerName} - Ready for checkout</Text>
              <Text size="xs" muted className="font-bold uppercase tracking-widest mt-1 opacity-60">Pending ledger finalisation & ERP sync</Text>
            </div>
          </div>
          <Button className="h-14 px-12 font-bold shadow-xl shadow-primary/20 scale-105" onClick={() => { store.generateInvoice(b.id); setInvoices([...store.getInvoices()]); }}>Generate Invoice</Button>
        </Card>
      ))}
      {activePayment && <PaymentLinkModal payment={activePayment} isOpen={!!activePayment} onClose={() => setActivePayment(null)} />}
    </div>
  );
};

// --- REPORTING VIEW ---
export const ReportingView = () => {
  const report = store.getMonthlyReport();
  return (
    <div className="space-y-12">
      <Stack spacing={1}>
        <Text size="2xl" weight="bold" className="tracking-tight">Operational Intelligence</Text>
        <Text muted>Aggregated analytics and performance benchmarking</Text>
      </Stack>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-12 shadow-2xl border-none bg-white rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={64} /></div>
          <Text muted size="xs" weight="black" className="uppercase tracking-widest mb-8 opacity-40">MTD Revenue</Text>
          <Text size="4xl" weight="bold" className="tracking-tighter text-primary">NOK {report.totalRevenue.toLocaleString()}</Text>
        </Card>
        <Card className="p-12 shadow-2xl border-none bg-white rounded-3xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><PieChart size={64} /></div>
          <Text muted size="xs" weight="black" className="uppercase tracking-widest mb-8 opacity-40">Avg. Occupancy</Text>
          <Text size="4xl" weight="bold" className="tracking-tighter text-blue-600">{(report.avgOccupancy * 100).toFixed(1)}%</Text>
        </Card>
        <Card className="p-12 shadow-2xl border-none bg-white rounded-3xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Moon size={64} /></div>
          <Text muted size="xs" weight="black" className="uppercase tracking-widest mb-8 opacity-40">Total Room Nights</Text>
          <Text size="4xl" weight="bold" className="tracking-tighter text-slate-800">{report.totalNights}</Text>
        </Card>
      </div>
    </div>
  );
};

// --- HOUSEKEEPING VIEW ---
export const HousekeepingView = () => {
  const [tasks, setTasks] = useState(store.getHousekeepingTasks());
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  return (
    <div className="space-y-8">
      <Stack spacing={1}>
        <Text size="xl" weight="bold">Sanitation Pipeline</Text>
        <Text size="sm" muted>Real-time turnover and maintenance cleaning queue</Text>
      </Stack>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pendingTasks.map(task => (
          <Card key={task.id} className="p-8 flex justify-between items-center border-none shadow-xl bg-white border-l-[12px] border-primary rounded-3xl group hover:shadow-2xl transition-all">
            <div>
              <Text weight="bold" size="2xl" className="tracking-tighter group-hover:text-primary transition-colors">Unit {store.getRoomById(task.roomId)?.number}</Text>
              <Text size="xs" muted className="uppercase font-black tracking-widest mt-2 opacity-50 flex items-center gap-2"><Clock size={12} /> {task.type}</Text>
            </div>
            <Button size="icon" variant="ghost" className="bg-green-500/10 text-green-600 rounded-2xl h-16 w-16 hover:bg-green-500 hover:text-white shadow-sm" onClick={() => setTasks(store.completeTask(task.id))}>
              <CheckCircle2 size={32} />
            </Button>
          </Card>
        ))}
        {pendingTasks.length === 0 && (
          <Card className="col-span-full p-32 text-center opacity-40 border-dashed border-4 bg-slate-50 rounded-3xl">
             <Text size="xl" weight="bold" className="tracking-tight italic">All inventory processed. Fleet is 100% clean.</Text>
          </Card>
        )}
      </div>
    </div>
  );
};

// --- MAINTENANCE VIEW ---
export const MaintenanceView = () => {
  const [tickets, setTickets] = useState(store.getTickets());
  const [rooms] = useState(store.getRooms());
  const [newTicket, setNewTicket] = useState({ roomId: '', description: '', priority: MaintenancePriority.MEDIUM });
  const submitTicket = () => {
    if (!newTicket.roomId || !newTicket.description) return;
    store.addTicket(newTicket);
    setTickets([...store.getTickets()]);
    setNewTicket({ roomId: '', description: '', priority: MaintenancePriority.MEDIUM });
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <Card className="p-10 h-fit shadow-2xl border-none bg-white rounded-3xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <HardHat size={22} />
          </div>
          <Text weight="bold" size="lg" className="uppercase tracking-widest text-primary">Technical Fault Log</Text>
        </div>
        <Stack spacing={6}>
          <div className="space-y-3">
             <Text size="xs" weight="black" className="uppercase opacity-40 tracking-widest">Select Unit</Text>
             <select className="w-full h-14 border rounded-2xl px-5 bg-muted/20 border-none shadow-inner text-sm font-black" value={newTicket.roomId} onChange={e => setNewTicket({...newTicket, roomId: e.target.value})}>
               <option value="">Choose room...</option>
               {rooms.map(r => <option key={r.id} value={r.id}>Unit {r.number}</option>)}
             </select>
          </div>
          <div className="space-y-3">
             <Text size="xs" weight="black" className="uppercase opacity-40 tracking-widest">Description</Text>
             <textarea className="w-full p-5 border rounded-2xl h-44 bg-muted/20 border-none shadow-inner text-sm font-medium" placeholder="Specify technical issues..." value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} />
          </div>
          <Button className="w-full h-16 font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 rounded-2xl active:scale-95 transition-all" onClick={submitTicket}>Record Log</Button>
        </Stack>
      </Card>
      <div className="lg:col-span-2 space-y-6">
        {tickets.map(t => (
          <Card key={t.id} className={`p-10 border-none shadow-xl bg-white border-l-[12px] rounded-3xl ${t.priority === MaintenancePriority.HIGH ? 'border-destructive' : 'border-slate-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <Text weight="bold" size="2xl" className="tracking-tighter">Unit {rooms.find(r => r.id === t.roomId)?.number}</Text>
              <Badge variant={t.priority === MaintenancePriority.HIGH ? 'destructive' : 'outline'} className="text-[10px] uppercase font-black px-4 py-1 shadow-sm">{t.priority} PRIORITY</Badge>
            </div>
            <Text size="base" muted className="leading-relaxed font-medium">"{t.description}"</Text>
            <div className="mt-8 flex items-center justify-between border-t pt-6 opacity-30">
               <Text size="xs" weight="black" className="uppercase tracking-widest">Status: {t.status}</Text>
               <Text size="xs" className="font-mono">{new Date(t.createdAt).toLocaleString()}</Text>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- KITCHEN VIEW ---
export const KitchenView = () => {
  const [items] = useState(store.getKitchenItems());
  const [meals, setMeals] = useState(store.getMeals());
  return (
    <div className="space-y-12">
      <Stack spacing={1}>
        <Text size="xl" weight="bold">Kitchen Display Board</Text>
        <Text size="sm" muted>Real-time catering fulfillment and guest dietary sync</Text>
      </Stack>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {meals.filter(m => m.status === 'Pending').map(meal => (
          <Card key={meal.id} className="p-10 border-none shadow-2xl bg-white border-t-[12px] border-orange-400 rounded-3xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <Text weight="bold" size="3xl" className="tracking-tighter leading-none">{meal.type}</Text>
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 font-black text-xl shadow-inner">
                x{meal.qty}
              </div>
            </div>
            <div className="flex flex-col gap-3 mb-8">
              <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-widest font-black opacity-60 px-4 py-1 bg-slate-50"><MapPin size={12} className="mr-2" /> {meal.servingLocation}</Badge>
              {meal.notes && <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100/50"><Text size="xs" muted className="italic text-orange-900 font-bold leading-relaxed">"{meal.notes}"</Text></div>}
            </div>
            <Button className="w-full h-16 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all" onClick={() => setMeals(store.updateMealStatus(meal.id, 'Served'))}>Mark Served</Button>
          </Card>
        ))}
        {meals.filter(m => m.status === 'Pending').length === 0 && (
          <Card className="col-span-full p-40 text-center opacity-30 border-dashed border-4 bg-slate-50 rounded-[40px] flex flex-col items-center gap-8">
             <Utensils size={100} strokeWidth={1} />
             <Text size="2xl" weight="bold" className="tracking-tight italic opacity-60">Kitchen queue is idle. All orders dispatched.</Text>
          </Card>
        )}
      </div>
    </div>
  );
};

// --- AUDIT LOG VIEW ---
export const AuditLogView = () => {
  const [logs] = useState(store.getLogs());
  return (
    <div className="space-y-8">
      <Stack spacing={1}>
        <Text size="xl" weight="bold">System Ledger</Text>
        <Text size="sm" muted>Historical audit of all platform events and staff interactions</Text>
      </Stack>
      <Card className="overflow-hidden shadow-2xl border-none rounded-3xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted text-[10px] font-bold border-b uppercase tracking-widest text-muted-foreground/60">
              <tr><th className="p-8">Timestamp</th><th className="p-8">Domain</th><th className="p-8">Action</th><th className="p-8">Details</th></tr>
            </thead>
            <tbody className="divide-y text-[13px] font-medium text-slate-600">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-all">
                  <td className="p-8 whitespace-nowrap font-mono opacity-40 text-xs">{new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}</td>
                  <td className="p-8"><Badge variant="outline" className="border-slate-200 text-[9px] font-black uppercase px-3 py-1 bg-slate-50">{log.domain}</Badge></td>
                  <td className="p-8 font-black text-primary uppercase tracking-tighter text-sm">{log.action}</td>
                  <td className="p-8 text-muted-foreground leading-relaxed italic text-sm">"{log.details}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
