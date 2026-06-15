import './instrument';
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AgentEventsProvider } from './hooks/useAgentEvents.jsx';
import { ClerkProvider } from '@clerk/react';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkAppearance = {
  variables: {
    colorPrimary: '#10b981',
    colorBackground: '#111111',
    colorForeground: '#ededed',
    colorInput: '#171717',
    colorBorder: '#262626',
    colorNeutral: '#a3a3a3',
    borderRadius: '0.5rem',
    fontFamily: '"Plus Jakarta Sans", "IBM Plex Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  elements: {
    modalBackdrop: 'bg-black/80 backdrop-blur-none',
    modalContent: 'bg-[#111111] text-[#ededed] border border-[#262626] shadow-none',
    cardBox: 'bg-[#111111] border border-[#262626] shadow-none',
    card: 'bg-[#111111] text-[#ededed] shadow-none',
    headerTitle: 'text-[#ededed]',
    headerSubtitle: 'text-[#a3a3a3]',
    socialButtonsBlockButton: 'bg-[#171717] border-[#262626] text-[#ededed] shadow-none hover:bg-[#1f1f1f]',
    dividerLine: 'bg-[#262626]',
    dividerText: 'text-[#737373]',
    formFieldLabel: 'text-[#ededed]',
    formFieldInput: 'bg-[#171717] border-[#262626] text-[#ededed] shadow-none placeholder:text-[#737373] focus:border-[#10b981]',
    formButtonPrimary: 'bg-[#10b981] text-[#020617] shadow-none hover:bg-[#34d399]',
    footer: 'bg-[#0f0f0f] border-t border-[#262626]',
    footerActionText: 'text-[#a3a3a3]',
    footerActionLink: 'text-[#34d399] hover:text-[#6ee7b7]',
    identityPreviewText: 'text-[#ededed]',
    identityPreviewEditButton: 'text-[#34d399]',
    otpCodeFieldInput: 'bg-[#171717] border-[#262626] text-[#ededed]',
  },
};

if (!PUBLISHABLE_KEY) {
  createRoot(document.getElementById('root')).render(
    <div
      style={{
        padding: '2rem',
        color: 'white',
        background: 'black',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
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
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
        <AgentEventsProvider>
          <App />
        </AgentEventsProvider>
      </ClerkProvider>
    </StrictMode>
  );
}
