<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Digilist Romutleie

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory and add your Gemini API key:
   ```bash
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
   Note: The `VITE_` prefix is required for Vite to expose the variable to the application.

3. (Optional) Set up Xala Platform:
   ```bash
   ./setup-platform.sh
   ```
   Or follow the manual setup in [PLATFORM_SETUP.md](./PLATFORM_SETUP.md)

4. Run the app:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## Xala Platform Integration

This project is configured to use `@xalatechnologies/platform` components. 

**Setup Required:**
- The platform package requires GitHub Packages authentication
- See [PLATFORM_SETUP.md](./PLATFORM_SETUP.md) for detailed setup instructions
- Run `./setup-platform.sh` for automated setup

**Current Status:**
- ✅ Optional dependencies installed (i18next, react-i18next, zod)
- ✅ Configuration files prepared
- ⏳ Platform package installation (requires GitHub auth token)
- ⏳ Component migration (after package install)
