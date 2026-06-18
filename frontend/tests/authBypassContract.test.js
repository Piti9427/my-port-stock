import { describe, expect, test } from 'vitest';

import { isDevAuthBypassEnabled, shouldUseClerkProvider } from '../src/auth/devAuth';

describe('development auth bypass contract', () => {
  test('enables bypass only for explicit local development UI testing', () => {
    expect(isDevAuthBypassEnabled({ DEV: true, VITE_DEV_AUTH_BYPASS: 'true' })).toBe(true);
  });

  test('keeps auth enforced by default and in production builds', () => {
    expect(isDevAuthBypassEnabled({ DEV: true })).toBe(false);
    expect(isDevAuthBypassEnabled({ DEV: false, VITE_DEV_AUTH_BYPASS: 'true' })).toBe(false);
  });

  test('does not load Clerk service during explicit dev UI bypass', () => {
    expect(shouldUseClerkProvider({ DEV: true, VITE_DEV_AUTH_BYPASS: 'true' })).toBe(false);
    expect(shouldUseClerkProvider({ DEV: true, VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_123' })).toBe(true);
    expect(shouldUseClerkProvider({ DEV: false, VITE_DEV_AUTH_BYPASS: 'true', VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_123' })).toBe(true);
  });
});
