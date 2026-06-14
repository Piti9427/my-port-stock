import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AgentEventsProvider } from './hooks/useAgentEvents.jsx';
import { ClerkProvider } from '@clerk/react';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  createRoot(document.getElementById('root')).render(
    <div style={{ padding: '2rem', color: 'white', background: 'black', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Missing Clerk Publishable Key</h2>
      <p>Please add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to your <code>frontend/.env</code> file.</p>
    </div>
  );
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider>
        <AgentEventsProvider>
          <App />
        </AgentEventsProvider>
      </ClerkProvider>
    </StrictMode>,
  );
}
