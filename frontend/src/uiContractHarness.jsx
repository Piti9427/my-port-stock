import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AgentEventsProvider } from './hooks/useAgentEvents.jsx';
import AIFloorPage from './pages/AIFloorPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import WatchlistPage from './pages/WatchlistPage.jsx';
import './index.css';

const SURFACES = {
  landing: LandingPage,
  onboarding: OnboardingPage,
  watchlist: WatchlistPage,
  'ai-floor': AIFloorPage,
};

const parameters = new URLSearchParams(globalThis.location.search);
const surface = parameters.get('surface') || 'landing';
const themePreference = parameters.get('theme') || 'light';
const resolvedTheme =
  themePreference === 'system' ? (globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : themePreference;
const Surface = SURFACES[surface] || LandingPage;

document.documentElement.dataset.theme = resolvedTheme;

const content =
  surface === 'ai-floor' ? (
    <AgentEventsProvider>
      <Surface />
    </AgentEventsProvider>
  ) : (
    <Surface />
  );

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <div className="min-h-screen bg-background text-foreground" data-ui-contract={`harness-${surface}`}>
      {content}
    </div>
  </BrowserRouter>
);
