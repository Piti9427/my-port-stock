import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AgentEventsProvider } from './hooks/useAgentEvents.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AgentEventsProvider>
      <App />
    </AgentEventsProvider>
  </StrictMode>,
);
