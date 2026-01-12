# Xala Platform Migration Guide

## Current Status

✅ **Completed:**
- `.npmrc` configured for GitHub Packages
- Optional dependencies installed (i18next, react-i18next, zod)
- CSS tokens import structure prepared
- I18nProvider setup prepared
- Platform adapter component created
- Setup script created

⏳ **Pending (Requires GitHub Authentication):**
- Install `@xalatechnologies/platform@2.0.0`
- Uncomment platform imports
- Migrate components to use platform components

## Quick Start

### 1. Authenticate with GitHub Packages

**Option A: Use the setup script**
```bash
./setup-platform.sh
```

**Option B: Manual setup**
```bash
# Add your GitHub token to .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> .npmrc

# Install the package
npm install @xalatechnologies/platform@2.0.0
```

### 2. Enable Platform Components

After installation, uncomment these lines:

**index.tsx:**
```typescript
import '@xalatechnologies/platform/dist/tokens.css';
import { I18nProvider } from '@xalatechnologies/platform/i18n/client';

// Wrap App with I18nProvider
<I18nProvider defaultLocale="nb" fallbackLocale="en">
  <App />
</I18nProvider>
```

**index.css:**
```css
@import '@xalatechnologies/platform/dist/tokens.css';
```

### 3. Migrate Components

Update imports in your components:

**Before:**
```typescript
import { Button, Card, Text } from './components/XalaUI';
```

**After:**
```typescript
import { Button, Card, Text } from '@xalatechnologies/platform/ui';
```

Or use the adapter:
```typescript
import { Button, Card, Text } from './components/PlatformAdapter';
```

## Component Mapping

| Current Component | Platform Component | Status |
|------------------|-------------------|--------|
| `Button` | `Button` | Ready |
| `Card` | `Card` | Ready |
| `Text` | `Text` | Ready |
| `Badge` | `Badge` | Ready |
| `Input` | `Input` | Ready |
| `Stack` | `Stack` | Ready |
| `Avatar` | `Avatar` | Ready |
| `Modal` | `Dialog` | Ready (note: different name) |
| `ApplicationShell` | `ApplicationShell` | Ready |

## React Version Compatibility

⚠️ **Note:** The platform package requires React 18, but this project uses React 19.

**Options:**
1. Test compatibility first (React 19 may work)
2. If issues occur, downgrade to React 18:
   ```bash
   npm install react@^18.0.0 react-dom@^18.0.0
   ```

## Available Platform Features

Once installed, you can use:

- **UI Components:** 45+ primitives, 50+ composed components
- **Internationalization:** i18n support with Norwegian (nb) and English (en)
- **RBAC:** Role-based access control utilities
- **Multi-tenancy:** Tenant resolution and management
- **Norwegian Integrations:** Visma, NETS, BankID, etc.
- **Security:** Security utilities and helpers

## Next Steps

1. ✅ Run `./setup-platform.sh` or manually authenticate
2. ✅ Install the platform package
3. ✅ Uncomment platform imports
4. ✅ Test the application
5. ✅ Gradually migrate components
6. ✅ Update component imports throughout the codebase

## Troubleshooting

**401 Unauthorized Error:**
- Ensure your GitHub token has `read:packages` scope
- Verify `.npmrc` contains the correct auth token
- Check you have access to `@xalatechnologies` organization

**React Version Conflicts:**
- Check peer dependency warnings
- Consider downgrading to React 18 if needed

**Import Errors:**
- Ensure package is installed: `npm list @xalatechnologies/platform`
- Check import paths match the package structure
- Verify Vite configuration includes the package

