export function isDevAuthBypassEnabled(env = import.meta.env) {
  return env.DEV === true && env.VITE_DEV_AUTH_BYPASS === 'true';
}

export function shouldUseClerkProvider(env = import.meta.env) {
  return !isDevAuthBypassEnabled(env) && Boolean(env.VITE_CLERK_PUBLISHABLE_KEY);
}
