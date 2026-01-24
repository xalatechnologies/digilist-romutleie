
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Import Xala Platform CSS Tokens
// Note: Uncomment once @xalatechnologies/platform is installed
// import '@xalatechnologies/platform/dist/tokens.css';
// Import I18nProvider
// import { I18nProvider } from '@xalatechnologies/platform/i18n/client';
import './i18n/config';
import './index.css';
import { RequestContextProvider } from './contexts/RequestContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Wrap with I18nProvider once package is installed */}
    {/* <I18nProvider defaultLocale="nb" fallbackLocale="en"> */}
      <RequestContextProvider>
        <App />
      </RequestContextProvider>
    {/* </I18nProvider> */}
  </React.StrictMode>
);
