
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
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Globe
} from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ComponentProps & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, variant = 'primary', size = 'md', className = '', onClick, disabled, type = 'button' }) => {
  // Using token-based classes with fallback to Tailwind utilities
  const baseStyles = "btn-base";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-token-sm border-2 border-primary/40 transition-token-base",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-token-sm border-2 border-secondary/40 transition-token-base",
    outline: "border-2 border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent shadow-token-sm transition-token-base",
    ghost: "text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-token-base",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-token-sm border-2 border-destructive/40 transition-token-base",
    success: "bg-success text-success-foreground hover:bg-success/90 shadow-token-sm border-2 border-success/40 transition-token-base",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-token-sm border-2 border-warning/40 transition-token-base",
    info: "bg-info text-info-foreground hover:bg-info/90 shadow-token-sm border-2 border-info/40 transition-token-base"
  };
  const sizes = {
    sm: "h-9 px-4 text-sm rounded-token-sm",
    md: "h-11 px-6 py-2 text-base rounded-token-md",
    lg: "h-14 px-10 text-lg rounded-token-lg",
    icon: "h-11 w-11 rounded-token-md"
  };

  // Get text color from variant to ensure it's always applied
  const getTextColor = () => {
    const variantStyle = variants[variant];
    if (variantStyle.includes('text-primary-foreground')) return 'text-primary-foreground';
    if (variantStyle.includes('text-secondary-foreground')) return 'text-secondary-foreground';
    if (variantStyle.includes('text-destructive-foreground')) return 'text-destructive-foreground';
    if (variantStyle.includes('text-success-foreground')) return 'text-success-foreground';
    if (variantStyle.includes('text-warning-foreground')) return 'text-warning-foreground';
    if (variantStyle.includes('text-info-foreground')) return 'text-info-foreground';
    if (variantStyle.includes('text-foreground')) return 'text-foreground';
    return 'text-foreground'; // Default fallback
  };

  // Remove any text color classes from custom className to prevent conflicts
  const cleanClassName = className.replace(/\btext-(primary|secondary|destructive|success|warning|info|foreground|muted)(-\w+)?\b/g, '');
  
  // Combine classes with text color at the end to ensure it's not overridden
  const textColorClass = getTextColor();
  const finalClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${cleanClassName} ${textColorClass}`.replace(/\s+/g, ' ').trim();
  
  return (
    <button 
      type={type}
      className={finalClassName}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<ComponentProps & { onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    className={`card-base border border-border/60 transition-token-base ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Text: React.FC<ComponentProps & { 
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  muted?: boolean;
  as?: 'p' | 'span' | 'div';
}> = ({ children, size = 'base', weight = 'normal', muted = false, className = '', as: Component = 'p' }) => {
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
    <Component className={`${sizes[size]} ${weights[weight]} ${muted ? 'text-muted-foreground' : ''} ${className}`}>
      {children}
    </Component>
  );
};

export const Label: React.FC<ComponentProps & {
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
}> = ({ children, htmlFor, required = false, helperText, className = '' }) => {
  return (
    <div className="space-y-1">
      <label 
        htmlFor={htmlFor}
        className={`block text-sm font-semibold text-foreground ${required ? 'after:content-["*"] after:ml-1 after:text-destructive' : ''} ${className}`}
      >
        {children}
      </label>
      {helperText && (
        <p className="text-xs text-muted-foreground" id={htmlFor ? `${htmlFor}-helper` : undefined}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export const Badge: React.FC<ComponentProps & { 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-primary text-primary-foreground border-2 border-primary/40",
    secondary: "bg-secondary text-secondary-foreground border-2 border-secondary/40",
    destructive: "bg-destructive text-destructive-foreground border-2 border-destructive/40",
    outline: "text-foreground border-2 border-border/70",
    success: "bg-success text-success-foreground border-2 border-success/40",
    warning: "bg-warning text-warning-foreground border-2 border-warning/40",
    info: "bg-info text-info-foreground border-2 border-info/40"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold tracking-tight ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
}> = ({ size = 'md', error = false, errorMessage, helperText, className = '', id, ...props }) => {
  const sizeClass = `input-base-${size}`;
  const errorClass = error ? 'input-base-error' : '';
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  
  return (
    <div className="w-full">
  <input 
    {...props}
        id={inputId}
        className={`input-base ${sizeClass} ${errorClass} transition-token-base ${className}`}
        aria-invalid={error}
        aria-describedby={helperId || errorId ? [helperId, errorId].filter(Boolean).join(' ') : undefined}
        aria-errormessage={errorId}
      />
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && errorMessage && (
        <p id={errorId} className="mt-1 text-xs text-destructive font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
}> = ({ size = 'md', error = false, errorMessage, helperText, className = '', id, ...props }) => {
  const sizeClass = `textarea-base-${size}`;
  const errorClass = error ? 'textarea-base-error' : '';
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = helperText ? `${textareaId}-helper` : undefined;
  const errorId = errorMessage ? `${textareaId}-error` : undefined;
  
  return (
    <div className="w-full">
      <textarea 
        {...props}
        id={textareaId}
        className={`textarea-base ${sizeClass} ${errorClass} transition-token-base ${className}`}
        aria-invalid={error}
        aria-describedby={helperId || errorId ? [helperId, errorId].filter(Boolean).join(' ') : undefined}
        aria-errormessage={errorId}
      />
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && errorMessage && (
        <p id={errorId} className="mt-1 text-xs text-destructive font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
}> = ({ size = 'md', error = false, errorMessage, helperText, className = '', id, children, ...props }) => {
  const sizeClass = `select-base-${size}`;
  const errorClass = error ? 'select-base-error' : '';
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = errorMessage ? `${selectId}-error` : undefined;
  
  return (
    <div className="w-full">
      <select 
        {...props}
        id={selectId}
        className={`select-base ${sizeClass} ${errorClass} transition-token-base ${className}`}
        aria-invalid={error}
        aria-describedby={helperId || errorId ? [helperId, errorId].filter(Boolean).join(' ') : undefined}
        aria-errormessage={errorId}
      >
        {children}
      </select>
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && errorMessage && (
        <p id={errorId} className="mt-1 text-xs text-destructive font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
);
};

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

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in transition-token-base"
        onClick={onClose}
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
      />
      <div className="relative w-full max-w-2xl bg-background rounded-token-xl shadow-token-2xl overflow-hidden border border-border animate-in zoom-in-95 fade-in transition-token-base" style={{ zIndex: 'var(--z-modal)' }}>
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <Text size="lg" weight="bold">{title}</Text>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-token-full !flex !items-center !justify-center p-0">
            <X size={20} />
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
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}> = ({ appName, children, user, userRole, onRoleChange, availableRoles, onLogoClick, sidebarOpen = true, onSidebarToggle }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground w-full">
      <div className="flex-1 flex flex-col w-full">
        <header className="flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md sticky top-0 px-3 sm:px-4 md:px-6 lg:px-8 w-full shadow-token-sm" style={{ zIndex: 'var(--z-sticky)' }}>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Sidebar Toggle Button - Desktop only */}
            {onSidebarToggle && (
              <button
                onClick={onSidebarToggle}
                className="hidden lg:flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg hover:bg-muted/60 transition-all duration-200 text-muted-foreground hover:text-foreground touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
              </button>
            )}
            
            <button 
              onClick={onLogoClick}
              className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-token-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-token-md px-1 sm:px-2 py-1 min-w-0"
            >
               <Text size="lg" weight="bold" className="text-primary tracking-tight sm:text-xl truncate">{appName}</Text>
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-8 shrink-0">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="relative h-10 w-10 sm:h-11 sm:w-11 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Bell size={20} className="sm:w-6 sm:h-6" />
              <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-destructive border-2 border-white"></span>
            </Button>
            
            <div className="hidden sm:flex items-center gap-2 md:gap-3 border-l border-border pl-3 md:pl-6 ml-1 md:ml-2">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Security Profile Selector styled as a button */}
                {availableRoles && onRoleChange && (
                  <div className="relative group flex items-center bg-primary px-2 py-1.5 md:px-3 md:py-2 rounded-token-lg shadow-token-sm transition-token-base hover:bg-primary/90 cursor-pointer text-primary-foreground active:scale-95 touch-manipulation">
                    <ShieldCheck size={12} className="mr-1.5 md:mr-2 opacity-90 md:w-3.5 md:h-3.5" />
                    <select 
                      className="bg-transparent text-[10px] md:text-xs font-bold uppercase tracking-wider outline-none cursor-pointer appearance-none pr-4 md:pr-5 z-10 touch-manipulation"
                      value={userRole}
                      onChange={(e) => onRoleChange(e.target.value)}
                      aria-label="Select user role"
                      title="Select user role"
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role} className="bg-white text-black font-sans capitalize tracking-normal text-sm font-medium">
                          {role.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 md:right-2 opacity-70 pointer-events-none transition-token-base group-hover:translate-y-0.5 md:w-3 md:h-3" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto w-full bg-muted/20">
          <div className="max-w-[1920px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// --- SHARED UI COMPONENTS (Unified Logic) ---

export const MoneyValue: React.FC<{ amount: number; currency?: string; className?: string }> = ({ amount, currency = 'NOK', className = '' }) => (
  <span className={`font-mono tabular-nums tracking-tight ${className}`}>
    {currency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </span>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
    <div className="space-y-1">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

export const FilterBar: React.FC<{
  primaryFilters?: React.ReactNode;
  search?: React.ReactNode;
  onClear?: () => void;
  className?: string;
}> = ({ primaryFilters, search, onClear, className = '' }) => (
  <div className={`flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full ${className}`}>
    <div className="flex flex-nowrap items-center gap-3 w-full xl:w-auto overflow-x-auto">
      {primaryFilters}
      {onClear && (
        <div className="h-6 w-px bg-border mx-1 hidden sm:block flex-shrink-0" />
      )}
      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-foreground h-9 flex-shrink-0 whitespace-nowrap">
          Clear
        </Button>
      )}
    </div>
    {search && <div className="w-full xl:w-64 flex-shrink-0">{search}</div>}
  </div>
);

export const DataTable: React.FC<{
  headers: (string | React.ReactNode)[];
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
}> = ({ headers, children, isEmpty, emptyMessage, className = '' }) => (
  <div className={`border border-border rounded-lg overflow-hidden bg-white shadow-sm ${className}`}>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="p-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Search size={24} className="opacity-20" />
                  <p>{emptyMessage || 'No records match the selected filters.'}</p>
                </div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export const DetailDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, subtitle, actions, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in transition-all pointer-events-auto"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-background h-full shadow-2xl border-l border-border pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-border bg-white/50 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Text size="xl" weight="bold">{title}</Text>
              {subtitle && <Text size="sm" muted>{subtitle}</Text>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full flex-shrink-0">
              <X size={20} />
            </Button>
          </div>
          {actions && <div className="flex items-center gap-2 pt-2">{actions}</div>}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};
