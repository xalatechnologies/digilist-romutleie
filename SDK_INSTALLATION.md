# SDK Installation Guide

## @xalatechnologies/platform Installation

The `@xalatechnologies/platform` package is hosted on GitHub Packages and requires authentication.

### Quick Setup

1. **Create GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name: "Xala Platform Access"
   - Select scope: `read:packages`
   - Generate and copy the token

2. **Add Token to .npmrc**
   ```bash
   echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
   ```
   
   Or manually edit `.npmrc` and add:
   ```
   @xalatechnologies:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```

3. **Install the Package**
   ```bash
   npm install @xalatechnologies/platform@2.0.0
   ```

4. **After Installation**
   - Uncomment platform imports in `index.tsx`
   - Uncomment platform tokens import in `index.css`
   - Update components to use platform components (optional, gradual migration)

### Alternative: Use npm login

```bash
npm login --scope=@xalatechnologies --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: YOUR_GITHUB_TOKEN
# Email: your-email@example.com
```

### Troubleshooting

- **401 Unauthorized**: Check that your token has `read:packages` scope
- **404 Not Found**: Ensure you have access to `@xalatechnologies` organization
- **Token in .npmrc**: Make sure `.npmrc` is in your `.gitignore` to avoid committing tokens

### Security Note

⚠️ **Never commit your GitHub token to version control!**

Add `.npmrc` to `.gitignore` if it contains your token, or use environment variables:
```bash
export NPM_TOKEN=your_token_here
echo "//npm.pkg.github.com/:_authToken=\${NPM_TOKEN}" >> .npmrc
```

