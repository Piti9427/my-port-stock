import { expect, test } from '@playwright/test';

const bypassHeaders = {
  Authorization: 'Bearer dev-ui-auth-bypass',
};

test('real Express routes return deterministic quote, decision, conflict, and provider-failure outcomes', async ({ request }) => {
  const validQuote = await request.get('/api/quote/NVDA');
  expect(validQuote.ok()).toBeTruthy();
  expect((await validQuote.json()).current_price_acceptance_gate).toBe('pass');

  const analysis = await request.post('/api/analyze', {
    headers: bypassHeaders,
    data: {
      ticker: 'NVDA',
      decision_mode: 'Swing Trade',
      risk_plan: { stop_loss: 90, hard_risk_thb: 500, rr_ratio: 2.5 },
    },
  });
  const analysisBody = await analysis.json();
  expect(analysis.ok()).toBeTruthy();
  expect(analysisBody.decision_snapshot.verdict).toBeDefined();

  const conflict = await request.get('/api/quote/CONFLICT');
  const conflictBody = await conflict.json();
  expect(conflictBody.status).toBe('INSUFFICIENT_DATA');
  expect(conflictBody.error_details).toContain('differ');

  const providerFailure = await request.get('/api/quote/FAIL');
  const providerFailureBody = await providerFailure.json();
  expect(providerFailureBody.status).toBe('INSUFFICIENT_DATA');
  expect(providerFailureBody.error_details).toContain('Fixture provider failure');
});

test('real WebSocket upgrade accepts one-time tickets and rejects invalid tickets', async ({ page, request }) => {
  await page.goto('/');
  const ticketResponse = await request.post('/api/ws-ticket', { headers: bypassHeaders });
  const { ticket } = await ticketResponse.json();

  const accepted = await page.evaluate(
    (issuedTicket) =>
      new Promise<boolean>((resolve) => {
        const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws/agent-events?ticket=${encodeURIComponent(issuedTicket)}`);
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = () => resolve(false);
      }),
    ticket
  );
  expect(accepted).toBe(true);

  const rejected = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws/agent-events?ticket=invalid`);
        ws.onopen = () => resolve(false);
        ws.onerror = () => resolve(true);
        ws.onclose = () => resolve(true);
      })
  );
  expect(rejected).toBe(true);
});

test('fixture-backed runtime data remains isolated by authenticated user', async ({ request }) => {
  const userA = await request.get('/api/holdings', {
    headers: { ...bypassHeaders, 'X-MPS-Test-User': 'fixture_user_a' },
  });
  const userB = await request.get('/api/holdings', {
    headers: { ...bypassHeaders, 'X-MPS-Test-User': 'fixture_user_b' },
  });

  expect((await userA.json()).holdings).toHaveLength(1);
  expect((await userB.json()).holdings).toHaveLength(0);
});
