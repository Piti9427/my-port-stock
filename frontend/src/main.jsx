import './instrument';
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AgentEventsProvider } from './hooks/useAgentEvents.jsx';
import { AppAuthProvider } from './auth/clerkAdapter.jsx';
import { isDevAuthBypassEnabled } from './auth/devAuth';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const devAuthBypass = isDevAuthBypassEnabled();
const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--brand-primary)',
    colorBackground: 'var(--surface-elevated)',
    colorForeground: 'var(--text-primary)',
    colorInput: 'var(--surface)',
    colorBorder: 'var(--border)',
    colorNeutral: 'var(--text-secondary)',
    borderRadius: '0.5rem',
    fontFamily: '"Plus Jakarta Sans", "IBM Plex Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  elements: {
    modalBackdrop: 'bg-overlay backdrop-blur-none',
    modalContent: 'border border-border bg-surface-elevated text-foreground shadow-none',
    cardBox: 'border border-border bg-surface-elevated shadow-none',
    card: 'bg-surface-elevated text-foreground shadow-none',
    headerTitle: 'text-foreground',
    headerSubtitle: 'text-text-secondary',
    socialButtonsBlockButton: 'border-border bg-surface text-foreground shadow-none hover:bg-surface-hover',
    dividerLine: 'bg-border',
    dividerText: 'text-text-muted',
    formFieldLabel: 'text-foreground',
    formFieldInput: 'border-border bg-surface text-foreground shadow-none placeholder:text-text-muted focus:border-brand',
    formButtonPrimary: 'bg-brand text-text-inverse shadow-none hover:bg-brand-dark',
    footer: 'border-t border-border bg-shell',
    footerActionText: 'text-text-secondary',
    footerActionLink: 'text-brand hover:text-fin-profit',
    identityPreviewText: 'text-foreground',
    identityPreviewEditButton: 'text-brand',
    otpCodeFieldInput: 'border-border bg-surface text-foreground',
  },
};

if (!PUBLISHABLE_KEY && !devAuthBypass) {
  createRoot(document.getElementById('root')).render(
    <div className="h-screen bg-background p-8 font-sans text-foreground">
      <h2>Missing Clerk Publishable Key</h2>
      <p>
        Please add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to your <code>frontend/.env</code> file.
      </p>
    </div>
  );
} else {
  createRoot(document.getElementById('root'), {
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      console.warn('Uncaught error', error, errorInfo.componentStack);
    }),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  }).render(
    <StrictMode>
      <AppAuthProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
        <AgentEventsProvider>
          <App />
        </AgentEventsProvider>
      </AppAuthProvider>
    </StrictMode>
  );
}
