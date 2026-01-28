import { ThemeCore } from '@mks2508/shadcn-basecoat-theme-manager';
import { ErrorBoundary } from 'solid-js';
import { render } from 'solid-js/web';
import App from './App';
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

    console.log('ThemeCore ready, mounting Solid app...');
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

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');

  render(
    () => (
      <ErrorBoundary
        fallback={(err) => (
          <div class="fixed inset-0 flex items-center justify-center bg-background p-4">
            <div class="text-center">
              <h1 class="text-xl font-bold text-destructive">Error critico en la aplicacion</h1>
              <p class="text-muted-foreground mt-2">{err.message}</p>
              <button
                type="button"
                class="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                onClick={() => window.location.reload()}
              >
                Recargar
              </button>
            </div>
          </div>
        )}
      >
        <App />
      </ErrorBoundary>
    ),
    root
  );
}

initializeApp();
