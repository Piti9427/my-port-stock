import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, BookOpen, ShieldAlert, BarChart2, Crosshair, Settings2 } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/react';
import DashboardPage from './pages/DashboardPage';
import CommandCenterPage from './pages/CommandCenterPage';
import JournalPage from './pages/JournalPage';
import PortfolioRiskPage from './pages/PortfolioRiskPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MarketExplorerPage from './pages/MarketExplorerPage';
import ConfigPage from './pages/ConfigPage';
import LandingPage from './pages/LandingPage';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import './index.css';

const NAV_LINKS = [
  { to: '/', label: 'แดชบอร์ด', end: true, icon: LayoutDashboard },
  { to: '/risk', label: 'บริหารความเสี่ยง', icon: ShieldAlert },
  { to: '/market', label: 'ตลาดหุ้น', icon: Crosshair },
  { to: '/command-center', label: 'Command Center', icon: Bot },
  { to: '/journal', label: 'บันทึกการเทรด', icon: BookOpen },
  { to: '/analytics', label: 'วิเคราะห์ผลงาน', icon: BarChart2 },
  { to: '/config', label: 'ตั้งค่าระบบ', icon: Settings2 },
];

function App() {
  return (
    <BrowserRouter>
      <KeyboardShortcuts />
      <div className="app-root">
        <SignedOut>
          <LandingPage />
        </SignedOut>

        <SignedIn>
          {/* Sidebar Navigation */}
          <nav className="side-nav" aria-label="Main navigation">
            <div className="side-nav-brand">
              <span className="brand-dot" aria-hidden="true" />
              <span className="brand-name">MyPortStock</span>
            </div>
            <div className="side-nav-links" role="tablist">
              {NAV_LINKS.map(({ to, label, end, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => isActive ? 'side-link active' : 'side-link'}
                  role="tab"
                  aria-label={label}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="side-nav-status">
              <div className="status-indicator">
                <span className="status-dot" aria-hidden="true" />
                <span className="status-text">Live Systems</span>
              </div>
              
              {/* Clerk Auth UI */}
              <UserButton />
            </div>
          </nav>

          {/* Page Content */}
          <main className="app-content" id="main-content">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/risk" element={<PortfolioRiskPage />} />
              <Route path="/market" element={<MarketExplorerPage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/config" element={<ConfigPage />} />
            </Routes>
          </main>
        </SignedIn>
      </div>
    </BrowserRouter>
  );
}

export default App;
