import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeContextProvider } from './lib/theme-context';
import './styles/themes/index.css';
import './styles/optimized-product-card.css';
import './styles/optimized-order-history.css';
import './styles/optimized-login.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary level="page" fallbackTitle="Error critico en la aplicacion">
      <ThemeContextProvider>
        <App />
      </ThemeContextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
