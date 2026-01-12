
import React, { useEffect } from 'react';
import { 
  Settings, 
  Users, 
  CreditCard, 
  ChevronRight, 
  Bell, 
  Search,
  Menu,
  X,
  Plus,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ComponentProps & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, variant = 'primary', size = 'md', className = '', onClick, disabled, type = 'button' }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
  };
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 py-2 text-base",
    lg: "h-14 px-10 text-lg",
    icon: "h-11 w-11"
  };

  return (
    <button 
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<ComponentProps & { onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    className={`bg-card text-card-foreground rounded-lg border shadow-sm ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Text: React.FC<ComponentProps & { 
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  muted?: boolean;
}> = ({ children, size = 'base', weight = 'normal', muted = false, className = '' }) => {
  const sizes = {
    xs: "text-sm",
    sm: "text-base",
    base: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
    '2xl': "text-3xl",
    '3xl': "text-4xl"
  };
  const weights = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold"
  };

  return (
    <p className={`${sizes[size]} ${weights[weight]} ${muted ? 'text-muted-foreground' : ''} ${className}`}>
      {children}
    </p>
  );
};

export const Badge: React.FC<ComponentProps & { 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "text-foreground border border-input",
    success: "bg-green-500 text-white"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold tracking-tight ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`flex h-11 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
  />
);

export const Stack: React.FC<ComponentProps & { spacing?: number; direction?: 'row' | 'col' }> = ({ children, spacing = 4, direction = 'col', className = '' }) => (
  <div className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'} gap-${spacing} ${className}`}>
    {children}
  </div>
);

export const Avatar: React.FC<{ src: string; fallback: string; className?: string }> = ({ src, fallback, className = '' }) => (
  <div className={`relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full ${className}`}>
    {src ? (
      <img src={src} alt={fallback} className="aspect-square h-full w-full object-cover" />
    ) : null}
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm font-bold uppercase">
      {fallback.substring(0, 2)}
    </div>
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-background rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="flex items-center justify-between p-6 border-b bg-muted/30">
          <Text size="lg" weight="bold">{title}</Text>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={24} />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ApplicationShell: React.FC<{
  appName: string;
  children: React.ReactNode;
  user?: { avatar: string };
  userRole?: string;
  onRoleChange?: (role: string) => void;
  availableRoles?: string[];
  onLogoClick?: () => void;
}> = ({ appName, children, user, userRole, onRoleChange, availableRoles, onLogoClick }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground w-full">
      <div className="flex-1 flex flex-col w-full">
        <header className="flex h-20 items-center justify-between border-b px-4 md:px-8 lg:px-12 bg-card/50 backdrop-blur-md sticky top-0 z-50 w-full">
          <div className="flex items-center gap-6">
            <button 
              onClick={onLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
            >
               <Text size="xl" weight="bold" className="text-primary tracking-tight">{appName}</Text>
            </button>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <Button variant="ghost" size="icon" className="relative h-11 w-11">
              <Bell size={24} />
              <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5 rounded-full bg-destructive border-2 border-white"></span>
            </Button>
            
            <div className="hidden sm:flex items-center gap-4 border-l pl-8 ml-2">
              <div className="flex items-center gap-4">
                {/* User Avatar */}
                <Avatar src={user?.avatar || ""} fallback={userRole || "U"} className="border-2 border-primary/10 shadow-sm" />
                
                {/* Security Profile Selector styled as a button */}
                {availableRoles && onRoleChange && (
                  <div className="relative group flex items-center bg-primary px-4 py-2.5 rounded-xl shadow-md transition-all hover:bg-primary/90 cursor-pointer text-primary-foreground active:scale-95">
                    <ShieldCheck size={16} className="mr-3 opacity-90" />
                    <select 
                      className="bg-transparent text-xs font-black uppercase tracking-widest outline-none cursor-pointer appearance-none pr-6 z-10"
                      value={userRole}
                      onChange={(e) => onRoleChange(e.target.value)}
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role} className="bg-white text-black font-sans capitalize tracking-normal text-sm font-medium">
                          {role.replace('_', ' ')} Profile
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 opacity-70 pointer-events-none transition-transform group-hover:translate-y-0.5" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
