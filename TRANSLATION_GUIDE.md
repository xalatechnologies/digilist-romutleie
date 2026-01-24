# Translation Guide

This application supports both **English (en)** and **Norwegian (nb)** languages. All user-facing strings must be translated.

## Translation Files

- **English**: `i18n/locales/en.json`
- **Norwegian**: `i18n/locales/nb.json`

## How to Add Translations

### 1. Always Add Both Languages

When adding a new string, you MUST add it to BOTH `en.json` and `nb.json` files.

### 2. Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <Text>{t('common.save')}</Text>
      <Button>{t('bookings.newReservation')}</Button>
    </div>
  );
};
```

### 3. Translation Key Structure

Organize keys by feature/component:
- `common.*` - Common UI elements (buttons, labels)
- `navigation.*` - Navigation menu items
- `rooms.*` - Rooms view
- `bookings.*` - Bookings view
- `dashboard.*` - Dashboard
- `payment.*` - Payment modals

### 4. Enum Translations

For enum values (RoomType, RoomStatus, PaymentMethod, etc.), create helper functions:

```tsx
const translateRoomType = (type: RoomType): string => {
  const typeMap: Record<RoomType, string> = {
    [RoomType.SINGLE]: t('rooms.typeSingle', 'Single'),
    [RoomType.DOUBLE]: t('rooms.typeDouble', 'Double'),
    [RoomType.APARTMENT]: t('rooms.typeApartment', 'Apartment')
  };
  return typeMap[type] || type;
};
```

### 5. Dynamic Strings

For strings with dynamic content, use i18next interpolation:

```tsx
// In translation file:
"warningFutureBookings": "⚠️ This unit has {{count}} future booking(s) that will be affected."

// In component:
{t('rooms.warningFutureBookings', { count: futureBookings })}
```

### 6. Fallback Values

Always provide a fallback (English) value:

```tsx
t('myKey', 'Fallback English Text')
```

## Checklist for New Features

- [ ] All hardcoded strings replaced with `t()` calls
- [ ] All new keys added to `en.json`
- [ ] All new keys added to `nb.json` with Norwegian translations
- [ ] Enum values translated using helper functions
- [ ] Placeholders translated
- [ ] Error messages translated
- [ ] Button labels translated
- [ ] Form labels translated

## Testing

1. Switch language to Norwegian
2. Navigate through all features
3. Verify all text is translated
4. Check that no English strings remain visible

## Language Switcher

The language switcher is in the header (globe icon). Language preference is saved to localStorage and persists across sessions.

