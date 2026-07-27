/**
 * @param {Partial<Pick<ImportMetaEnv, 'DEV'|'VITE_DEV_AUTH_BYPASS'|'VITE_CLERK_PUBLISHABLE_KEY'>>} env
 */
export function isDevAuthBypassEnabled(env = import.meta.env) {
  return env.DEV === true && env.VITE_DEV_AUTH_BYPASS === 'true';
}

/**
 * @param {Partial<Pick<ImportMetaEnv, 'DEV'|'VITE_DEV_AUTH_BYPASS'|'VITE_CLERK_PUBLISHABLE_KEY'>>} env
 */
export function shouldUseClerkProvider(env = import.meta.env) {
  return !isDevAuthBypassEnabled(env) && Boolean(env.VITE_CLERK_PUBLISHABLE_KEY);
}
