import {
  ClerkProvider as RealClerkProvider,
  Show as RealShow,
  SignInButton as RealSignInButton,
  UserButton as RealUserButton,
  useAuth as useRealAuth,
} from '@clerk/react';
import { isDevAuthBypassEnabled, shouldUseClerkProvider } from './devAuth';

export function AppAuthProvider({ children, publishableKey, appearance }) {
  if (!shouldUseClerkProvider()) {
    return children;
  }

  return (
    <RealClerkProvider publishableKey={publishableKey} appearance={appearance}>
      {children}
    </RealClerkProvider>
  );
}

export function Show({ when, children }) {
  if (!isDevAuthBypassEnabled()) {
    return <RealShow when={when}>{children}</RealShow>;
  }

  return when === 'signed-in' ? children : null;
}

export function UserButton() {
  if (isDevAuthBypassEnabled()) {
    return null;
  }

  return <RealUserButton />;
}

export function SignInButton({ children, ...props }) {
  if (isDevAuthBypassEnabled()) {
    return children;
  }

  return <RealSignInButton {...props}>{children}</RealSignInButton>;
}

export function useAuth() {
  if (isDevAuthBypassEnabled()) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: 'dev-ui-user',
      getToken: async () => 'dev-ui-auth-bypass',
    };
  }

  // Dev UI bypass intentionally skips ClerkProvider, so the real hook is only safe in Clerk mode.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useRealAuth();
}
