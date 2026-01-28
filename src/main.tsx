import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeCore } from '@mks2508/shadcn-basecoat-theme-manager';
import { ThemeProvider } from '@mks2508/theme-manager-react';
import { OnboardingProvider } from './components/Onboarding/OnboardingProvider';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/optimized-product-card.css';
import './styles/optimized-order-history.css';
import './styles/optimized-login.css';

async function initializeApp() {
  try {
    console.log('Initializing ThemeCore...');

    await ThemeCore.init({
      debug: import.meta.env.DEV,
      fouc: {
        prevent: true,
        method: 'auto',
        revealDelay: 0,
      },
      defaults: {
        theme: 'default',
        mode: 'auto',
      },
    });

    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.15s ease-out';

    console.log('ThemeCore ready, mounting React app...');
  } catch (error) {
    console.error('ThemeCore initialization failed:', error);
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
  }

  // Safety fallback
  setTimeout(() => {
    if (document.body.style.visibility !== 'visible') {
      console.warn('Safety fallback: Revealing body manually');
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
    }
  }, 1000);

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <ErrorBoundary level="page" fallbackTitle="Error critico en la aplicacion">
        <ThemeProvider defaultTheme="default" defaultMode="auto">
          <OnboardingProvider>
            <App />
          </OnboardingProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

initializeApp();
