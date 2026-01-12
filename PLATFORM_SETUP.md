# Xala Platform Setup Guide

## Authentication Required

The `@xalatechnologies/platform` package is hosted on GitHub Packages and requires authentication.

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `read:packages` scope
3. Copy the token

### Step 2: Configure npm Authentication

**Option A: Add to .npmrc (Recommended for local development)**
```bash
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
```

**Option B: Use npm login**
```bash
npm login --scope=@xalatechnologies --registry=https://npm.pkg.github.com
```

### Step 3: Install the Package

```bash
npm install @xalatechnologies/platform@2.0.0
```

## After Installation

Once the package is installed, uncomment the following lines:

1. **index.tsx**: Uncomment the I18nProvider import and wrapper
2. **index.css**: Uncomment the platform tokens import
3. **components/XalaUI.tsx**: Update to use platform components

## Migration Notes

- The project currently uses custom UI components in `components/XalaUI.tsx`
- These can be gradually replaced with platform components
- Platform components are imported from `@xalatechnologies/platform/ui`

## React Version Note

The package requires React 18, but this project uses React 19. You may need to:
- Test compatibility first
- Or downgrade to React 18 if issues occur

