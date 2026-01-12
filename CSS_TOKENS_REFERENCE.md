# CSS Tokens Reference

This project uses a comprehensive CSS token system that aligns with Xala Platform standards. All tokens are defined in `index.css` and can be used throughout the application.

## Color Tokens

### Base Colors
- `--background` - Main background color
- `--foreground` - Main text color

### Primary Colors
- `--primary` - Primary brand color
- `--primary-foreground` - Text on primary background
- `--primary-hover` - Primary hover state
- `--primary-active` - Primary active state

### Secondary Colors
- `--secondary` - Secondary color
- `--secondary-foreground` - Text on secondary background
- `--secondary-hover` - Secondary hover state

### Semantic Colors
- `--success` - Success state color
- `--success-foreground` - Text on success background
- `--success-hover` - Success hover state
- `--warning` - Warning state color
- `--warning-foreground` - Text on warning background
- `--warning-hover` - Warning hover state
- `--info` - Info state color
- `--info-foreground` - Text on info background
- `--info-hover` - Info hover state
- `--destructive` - Error/destructive color
- `--destructive-foreground` - Text on destructive background
- `--destructive-hover` - Destructive hover state

### Muted & Accent
- `--muted` - Muted background
- `--muted-foreground` - Muted text
- `--accent` - Accent color
- `--accent-foreground` - Text on accent

### Component Colors
- `--card` - Card background
- `--card-foreground` - Card text
- `--card-border` - Card border
- `--popover` - Popover background
- `--popover-foreground` - Popover text
- `--border` - Default border color
- `--input` - Input border color
- `--input-focus` - Input focus border color
- `--ring` - Focus ring color
- `--ring-offset` - Focus ring offset color

## Spacing Tokens

- `--spacing-xs` - 0.25rem (4px)
- `--spacing-sm` - 0.5rem (8px)
- `--spacing-md` - 1rem (16px)
- `--spacing-lg` - 1.5rem (24px)
- `--spacing-xl` - 2rem (32px)
- `--spacing-2xl` - 3rem (48px)
- `--spacing-3xl` - 4rem (64px)

## Border Radius Tokens

- `--radius-sm` - Small radius
- `--radius-md` - Medium radius (default)
- `--radius-lg` - Large radius
- `--radius-xl` - Extra large radius
- `--radius-2xl` - 2X large radius
- `--radius-3xl` - 3X large radius
- `--radius-full` - Full circle (9999px)

## Shadow Tokens

- `--shadow-sm` - Small shadow
- `--shadow-md` - Medium shadow
- `--shadow-lg` - Large shadow
- `--shadow-xl` - Extra large shadow
- `--shadow-2xl` - 2X large shadow

## Z-Index Tokens

- `--z-base` - Base layer (0)
- `--z-dropdown` - Dropdown (1000)
- `--z-sticky` - Sticky elements (1020)
- `--z-fixed` - Fixed elements (1030)
- `--z-modal-backdrop` - Modal backdrop (1040)
- `--z-modal` - Modal content (1050)
- `--z-popover` - Popover (1060)
- `--z-tooltip` - Tooltip (1070)

## Transition Tokens

- `--transition-fast` - 150ms transition
- `--transition-base` - 200ms transition
- `--transition-slow` - 300ms transition

## Typography Tokens

- `--font-sans` - Sans-serif font stack
- `--font-mono` - Monospace font stack

## Usage Examples

### In CSS
```css
.my-component {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
  z-index: var(--z-modal);
}
```

### In Tailwind Classes
```jsx
<div className="bg-primary text-primary-foreground rounded-token-md shadow-token-lg">
  Content
</div>
```

### In Inline Styles
```jsx
<div style={{ 
  backgroundColor: 'hsl(var(--primary))',
  borderRadius: 'var(--radius-lg)',
  zIndex: 'var(--z-modal)'
}}>
  Content
</div>
```

### Using Utility Classes
```jsx
// Text colors
<p className="text-primary">Primary text</p>
<p className="text-success">Success text</p>
<p className="text-warning">Warning text</p>

// Background colors
<div className="bg-primary">Primary background</div>
<div className="bg-success">Success background</div>

// Border colors
<div className="border border-primary">Primary border</div>

// Radius utilities
<div className="rounded-token-sm">Small radius</div>
<div className="rounded-token-lg">Large radius</div>
<div className="rounded-token-full">Full circle</div>

// Shadow utilities
<div className="shadow-token-sm">Small shadow</div>
<div className="shadow-token-xl">Large shadow</div>

// Transition utilities
<div className="transition-token-fast">Fast transition</div>
<div className="transition-token-base">Base transition</div>
```

## Component Base Classes

### Button Base
```jsx
<button className="btn-base bg-primary text-primary-foreground">
  Button
</button>
```

### Card Base
```jsx
<div className="card-base">
  Card content
</div>
```

### Input Base
```jsx
<input className="input-base" type="text" />
```

## Dark Mode

All tokens automatically adapt to dark mode when the `.dark` class is applied to the root element:

```jsx
<html className="dark">
  {/* Dark mode tokens are automatically applied */}
</html>
```

## Platform Integration

When `@xalatechnologies/platform` is installed, its tokens will override these defaults. The structure is designed to be compatible with the platform's token system.

## Best Practices

1. **Always use tokens** - Never hardcode colors, spacing, or other values
2. **Use semantic tokens** - Prefer `--primary` over specific color values
3. **Leverage utility classes** - Use Tailwind classes that reference tokens
4. **Maintain consistency** - Use the same tokens for similar UI elements
5. **Test dark mode** - Ensure all components work in both light and dark modes

