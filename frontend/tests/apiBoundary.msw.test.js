import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { fetchWithAuth } from '../src/lib/api.js';

const server = setupServer(
  http.post('http://localhost/api/preferences', async ({ request }) => {
    expect(request.headers.get('authorization')).toBe('Bearer test-token');
    expect(await request.json()).toEqual({ reporting_currency: 'THB' });
    return HttpResponse.json({ reporting_currency: 'THB' });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('frontend request boundary', () => {
  test('serializes authenticated JSON through MSW without replacing Express E2E', async () => {
    const result = await fetchWithAuth(
      'http://localhost/api/preferences',
      vi.fn(async () => 'test-token'),
      {
        method: 'POST',
        body: { reporting_currency: 'THB' },
      }
    );
    expect(result).toEqual({ reporting_currency: 'THB' });
  });
});
