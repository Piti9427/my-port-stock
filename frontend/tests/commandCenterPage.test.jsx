import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import CommandCenterPage from '../src/pages/CommandCenterPage';
import { PreferencesContext } from '../src/preferences/PreferencesContext.jsx';

const getToken = vi.fn().mockResolvedValue('token_123');
const fetchWithAuth = vi.fn();
const resetAnalysis = vi.fn();

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock('../src/lib/api', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));

vi.mock('../src/hooks/useAgentEvents', () => ({
  useAgentEvents: () => ({ agentStates: {}, analysisResult: null, resetAnalysis }),
}));

beforeEach(() => {
  fetchWithAuth.mockReset();
  resetAnalysis.mockReset();
  fetchWithAuth.mockImplementation(async (url) => {
    if (url === '/api/quote/TSM') {
      return { ticker: 'TSM', last_price: 200, price_sources: ['Yahoo', 'Nasdaq'], current_price_acceptance_gate: 'pass' };
    }
    if (url === '/api/analyze') {
      return {
        ticker: 'TSM',
        decision_snapshot: { verdict: 'Wait', score: 6, one_line_reason: 'Needs confirmation', immediate_next_action: 'Confirm broker quote' },
      };
    }
    if (url === '/api/chat') return { message: 'Verified-context answer' };
    if (url === '/api/journal') return { id: 'trade_1' };
    throw new Error(`Unexpected URL: ${url}`);
  });
});

test('uses authenticated helpers for quote and immediate analysis result', async () => {
  render(
    <MemoryRouter initialEntries={['/command-center?ticker=tsm']}>
      <CommandCenterPage />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Load quote' }));
  await screen.findByText(/Gate-passed quote/i);
  expect(fetchWithAuth).toHaveBeenCalledWith('/api/quote/TSM', getToken);

  fireEvent.click(screen.getByRole('button', { name: 'วิเคราะห์' }));
  await screen.findByText('Confirm broker quote');
  expect(resetAnalysis).toHaveBeenCalled();
  expect(fetchWithAuth).toHaveBeenCalledWith(
    '/api/analyze',
    getToken,
    expect.objectContaining({ method: 'POST', body: expect.objectContaining({ ticker: 'TSM', decision_mode: 'Quick Trade' }) })
  );
});

test('sends the selected English language with AI analysis and chat requests', async () => {
  render(
    <PreferencesContext.Provider value={{ preferences: { language: 'en' } }}>
      <MemoryRouter initialEntries={['/command-center?ticker=TSM']}>
        <CommandCenterPage />
      </MemoryRouter>
    </PreferencesContext.Provider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
  await screen.findByText('Confirm broker quote');
  expect(fetchWithAuth).toHaveBeenCalledWith(
    '/api/analyze',
    getToken,
    expect.objectContaining({ body: expect.objectContaining({ language: 'en' }) })
  );

  fireEvent.click(screen.getByRole('tab', { name: 'Chat' }));
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'What invalidates this thesis?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await screen.findByText('Verified-context answer');
  expect(fetchWithAuth).toHaveBeenCalledWith('/api/chat', getToken, expect.objectContaining({ body: expect.objectContaining({ language: 'en' }) }));
});

test('routes chat and executed trade writes through authenticated APIs', async () => {
  render(
    <MemoryRouter initialEntries={['/command-center?ticker=TSM']}>
      <CommandCenterPage />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('tab', { name: 'สนทนา' }));
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'What invalidates this thesis?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await screen.findByText('Verified-context answer');
  expect(fetchWithAuth).toHaveBeenCalledWith(
    '/api/chat',
    getToken,
    expect.objectContaining({ method: 'POST', body: expect.objectContaining({ ticker: 'TSM' }) })
  );

  fireEvent.click(screen.getByRole('tab', { name: 'วิเคราะห์ mode' }));
  fireEvent.click(screen.getByRole('button', { name: 'วิเคราะห์' }));
  await screen.findByText('Confirm broker quote');
  fireEvent.click(screen.getByRole('button', { name: 'Log executed trade' }));
  fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Execution price'), { target: { value: '200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record executed trade' }));

  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/journal', getToken, expect.objectContaining({ method: 'POST' })));
});

async function openTradeTicket() {
  render(
    <MemoryRouter initialEntries={['/command-center?ticker=TSM']}>
      <CommandCenterPage />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Load quote' }));
  await screen.findByText(/Gate-passed quote/i);
  fireEvent.click(screen.getByRole('button', { name: 'วิเคราะห์' }));
  await screen.findByText('Confirm broker quote');
  fireEvent.click(screen.getByRole('button', { name: 'Log executed trade' }));
  fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '1' } });
}

test.each([
  ['-10', /greater than zero/i],
  ['abc', /greater than zero/i],
  ['0', /greater than zero/i],
])('rejects invalid execution price %s before journal write', async (priceValue, errorPattern) => {
  await openTradeTicket();
  fireEvent.change(screen.getByLabelText('Execution price'), { target: { value: priceValue } });
  const form = screen.getByRole('button', { name: 'Record executed trade' }).closest('form');
  form.noValidate = true;
  fireEvent.submit(form);

  expect(await screen.findByRole('alert')).toHaveTextContent(errorPattern);
  expect(fetchWithAuth).not.toHaveBeenCalledWith('/api/journal', expect.anything(), expect.anything());
});

test('accepts a high but numeric execution price after other fields are valid', async () => {
  await openTradeTicket();
  fireEvent.change(screen.getByLabelText('Execution price'), { target: { value: '999999999' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record executed trade' }));

  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/journal', getToken, expect.objectContaining({ method: 'POST' })));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('rejects an incomplete successful quote payload instead of displaying placeholder pricing', async () => {
  fetchWithAuth.mockImplementation(async (url) => {
    if (url === '/api/quote/TSM') return {};
    throw new Error(`Unexpected URL: ${url}`);
  });

  render(
    <MemoryRouter initialEntries={['/command-center?ticker=TSM']}>
      <CommandCenterPage />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Load quote' }));

  expect(await screen.findByText('Quote unavailable')).toBeInTheDocument();
  expect(screen.getByText(/valid last_price/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Retry quote' })).toBeInTheDocument();
});
