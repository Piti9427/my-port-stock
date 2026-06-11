import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, BookOpen, ShieldAlert, BarChart2, Crosshair, Settings2 } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import AIFloorPage from './pages/AIFloorPage';
import JournalPage from './pages/JournalPage';
import PortfolioRiskPage from './pages/PortfolioRiskPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MarketExplorerPage from './pages/MarketExplorerPage';
import ConfigPage from './pages/ConfigPage';
import './index.css';

const NAV_LINKS = [
  { to: '/', label: 'แดชบอร์ด', end: true, icon: LayoutDashboard },
  { to: '/risk', label: 'บริหารความเสี่ยง', icon: ShieldAlert },
  { to: '/market', label: 'ตลาดหุ้น', icon: Crosshair },
  { to: '/ai-floor', label: 'ห้องวิเคราะห์ AI', icon: Bot },
  { to: '/journal', label: 'บันทึกการเทรด', icon: BookOpen },
  { to: '/analytics', label: 'วิเคราะห์ผลงาน', icon: BarChart2 },
  { to: '/config', label: 'ตั้งค่าระบบ', icon: Settings2 },
];

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        {/* Tab Navigation */}
        <nav className="tab-nav" aria-label="Main navigation">
          <div className="tab-nav-brand">
            <span className="brand-dot" aria-hidden="true" />
            <span className="brand-name">MyPortStock Terminal</span>
          </div>
          <div className="tab-nav-links" role="tablist">
            {NAV_LINKS.map(({ to, label, end, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => isActive ? 'tab-link active' : 'tab-link'}
                role="tab"
                aria-label={label}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
          <div className="tab-nav-status">
            <span className="status-dot" aria-hidden="true" />
            <span className="status-text">Live</span>
          </div>
        </nav>

        {/* Page Content */}
        <main className="app-content" id="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/risk" element={<PortfolioRiskPage />} />
            <Route path="/market" element={<MarketExplorerPage />} />
            <Route path="/ai-floor" element={<AIFloorPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
