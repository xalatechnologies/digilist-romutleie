# i18n Tech Snapshot

## Library/Pattern
- **Library**: `react-i18next` (i18next with React integration)
- **Config File**: `i18n/config.ts`
- **Translation Files**: 
  - `i18n/locales/en.json` (English)
  - `i18n/locales/nb.json` (Norwegian Bokmål)

## Language Toggle Location
- **Component**: `components/LanguageSwitcher.tsx`
- **Storage**: `localStorage.getItem('language')` / `localStorage.setItem('language', lang)`
- **Default**: English (`en`)
- **Supported**: `en` (English), `nb` (Norwegian Bokmål)

## Translation File Structure
- Nested JSON structure with dot notation keys
- Organized by feature: `common.*`, `navigation.*`, `rooms.*`, `bookings.*`, `dashboard.*`, etc.
- Supports interpolation: `{{variable}}` syntax

## How to Translate Text in Components

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  // Basic usage with fallback
  return <Text>{t('common.save', 'Save')}</Text>;
  
  // With interpolation
  return <Text>{t('rooms.warningFutureBookings', { count: 5 })}</Text>;
};
```

## Current Status
- ✅ i18n infrastructure exists
- ✅ Language switcher functional
- ✅ Translation files exist for both languages
- ⚠️ Many hardcoded strings still present in components
- ⚠️ Status/enum values not consistently localized
- ⚠️ Missing translation detection not implemented

## Next Steps
1. Create status/enum localization helpers
2. Extract all hardcoded strings
3. Add missing translations
4. Implement verification mechanisms

