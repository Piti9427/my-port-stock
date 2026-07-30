import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import TodayPage from '../src/pages/TodayPage.jsx';
import { PreferencesContext } from '../src/preferences/PreferencesContext.jsx';

const mockTodayData = {
  queue: [
    {
      category: 'protect',
      type: 'stop_proximity',
      ticker: 'AAPL',
      reason: 'AAPL is within 2.5% of stop-loss',
      cta: 'Analyze',
      ctaRoute: '/command-center?ticker=AAPL',
      evidence: { price: 178.5, stop_loss: 175.0 },
    },
    {
      category: 'prepare',
      type: 'upcoming_earnings',
      ticker: 'MSFT',
      reason: 'MSFT reports earnings in 3 days',
      cta: 'Analyze',
      ctaRoute: '/command-center?ticker=MSFT',
      evidence: { daysToEarnings: 3 },
    },
    {
      category: 'opportunity',
      type: 'watchlist_alert',
      ticker: 'TSLA',
      reason: 'TSLA crossed alert at 200',
      cta: 'Analyze',
      ctaRoute: '/ticker/TSLA',
      evidence: { price: 205, alertPrice: 200, alertType: 'above' },
    },
    {
      category: 'learn',
      type: 'post_mortem_missing',
      ticker: 'NVDA',
      reason: 'NVDA trade closed with no post-mortem',
      cta: 'Write Post-Mortem',
      ctaRoute: '/journal',
      evidence: { ticker: 'NVDA' },
    },
  ],
  pulse: {
    totalValue: 250000,
    totalCost: 245000,
    totalPl: 5000,
    drawdownPct: 2.1,
    portfolioBeta: 1.15,
    speculativeWeightPct: 12.5,
    missingStopCount: 1,
    sectorBreaches: [{ sector: 'Technology', weight: 42.0 }],
    maxDrawdownPct: 15,
  },
  loading: false,
  status: 'OK',
  refetch: vi.fn(),
};

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: async () => 'token_123' }),
}));

vi.mock('../src/hooks/useToday.js', () => ({
  useToday: () => mockTodayData,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderTodayPage(language) {
  const content = (
    <Routes>
      <Route
        path="*"
        element={
          <>
            <TodayPage />
            <LocationProbe />
          </>
        }
      />
    </Routes>
  );

  return render(
    <MemoryRouter initialEntries={['/']}>
      {language ? <PreferencesContext.Provider value={{ preferences: { language } }}>{content}</PreferencesContext.Provider> : content}
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

test('TodayPage renders priority queue and pulse metrics', () => {
  renderTodayPage();

  // Assert queue cards are present
  expect(screen.getAllByText('AAPL is within 2.5% of stop-loss')[0]).toBeInTheDocument();
  expect(screen.getAllByText('MSFT reports earnings in 3 days')[0]).toBeInTheDocument();
  expect(screen.getAllByText('TSLA crossed alert at 200')[0]).toBeInTheDocument();
  expect(screen.getAllByText('NVDA trade closed with no post-mortem')[0]).toBeInTheDocument();

  // Assert pulse dashboard values
  expect(screen.getByText('PORTFOLIO PULSE')).toBeInTheDocument();
  expect(screen.getByText('฿250,000')).toBeInTheDocument();
  expect(screen.getByText('12.5% / 20%')).toBeInTheDocument();
  expect(screen.getByText('Technology')).toBeInTheDocument();
  expect(screen.getByText('42% > 35%')).toBeInTheDocument();
});

test('TodayPage renders translated page copy in English mode', () => {
  renderTodayPage('en');

  expect(screen.getByText('Review portfolio signals and actions from the daily risk assessment system.')).toBeInTheDocument();
});

test('TodayPage card CTAs trigger correct page routing', async () => {
  renderTodayPage();

  const ctaButtons = screen.getAllByRole('button', { name: /(Analyze|Write Post-Mortem)/i });

  // Click first button (AAPL Analyze CTA)
  fireEvent.click(ctaButtons[0]);
  expect(screen.getByTestId('location')).toHaveTextContent('/command-center?ticker=AAPL');
});

test('Dismissing a card saves it to localStorage and filters it from view', async () => {
  renderTodayPage();

  const dismissButtons = screen.getAllByRole('button', { name: /Dismiss Alarm/i });
  expect(screen.getAllByText('AAPL is within 2.5% of stop-loss')[0]).toBeInTheDocument();

  // Dismiss AAPL card
  fireEvent.click(dismissButtons[0]);

  // Card should disappear from active layout after exit animation completes
  await waitFor(() => {
    expect(screen.queryAllByText('AAPL is within 2.5% of stop-loss').length).toBe(0);
  });

  // Check localStorage contains key
  const dismissedKey = 'myportstock_dismissed_protect_stop_proximity_AAPL';
  expect(localStorage.getItem(dismissedKey)).not.toBeNull();
});
