import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import AnalyticsPage from '../src/pages/AnalyticsPage.jsx';
import DashboardPage from '../src/pages/DashboardPage.jsx';
import JournalPage from '../src/pages/JournalPage.jsx';
import PortfolioRiskPage from '../src/pages/PortfolioRiskPage.jsx';

const getToken = vi.fn().mockResolvedValue('token_123');
const fetchWithAuth = vi.fn();

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: (...args) => getToken(...args) }),
}));

vi.mock('../src/lib/api.js', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));
vi.mock('../src/components/PixelTradingFloor', () => ({ default: () => null }));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
}

function renderRoute(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <>
              {element}
              <LocationProbe />
            </>
          }
        />
        <Route path="/journal" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockImplementation(async (url) => {
    if (url === '/api/holdings') return [];
    if (url === '/api/watchlists') return [];
    if (url === '/api/journal') return { trades: [] };
    throw new Error(`Unexpected URL: ${url}`);
  });
});

test('Dashboard first-run empty portfolio guides the user to create holdings from a journal trade', async () => {
  renderRoute('/', <DashboardPage />);

  expect(await screen.findByText('เริ่มต้นโดยเพิ่มหุ้นในพอร์ต')).toBeInTheDocument();
  expect(screen.getByText(/No portfolio data yet/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเทรดครั้งแรก' }));
  expect(screen.getByLabelText('location')).toHaveTextContent('/journal');
});

test('Journal first-run empty state opens the log trade drawer', async () => {
  renderRoute('/journal', <JournalPage />);

  expect(await screen.findByText('บันทึกเทรดครั้งแรกเพื่อเริ่มติดตาม')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเทรดครั้งแรก' }));

  expect(screen.getByRole('dialog', { name: 'Log trade' })).toBeInTheDocument();
});

test('Analytics first-run state requires at least one closed trade', async () => {
  renderRoute('/analytics', <AnalyticsPage />);

  expect(await screen.findByText('ต้องมี trade ที่ปิดแล้วอย่างน้อย 1 รายการ')).toBeInTheDocument();
  expect(screen.getByText('ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ')).toBeInTheDocument();
});

test('Risk first-run empty state explains holdings are required before risk can be calculated', async () => {
  renderRoute('/risk', <PortfolioRiskPage />);

  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/holdings', expect.any(Function), expect.any(Object)));
  expect(await screen.findByText('ยังไม่มีพอร์ตการลงทุน 📈')).toBeInTheDocument();
});
