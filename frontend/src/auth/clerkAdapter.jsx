import {
  ClerkProvider as RealClerkProvider,
  Show as RealShow,
  SignInButton as RealSignInButton,
  UserButton as RealUserButton,
  useAuth as useRealAuth,
} from '@clerk/react';
import PropTypes from 'prop-types';
import { isDevAuthBypassEnabled, shouldUseClerkProvider } from './devAuth';

const DEV_AUTH_BYPASS_STATE = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'dev-ui-user',
  getToken: async () => 'dev-ui-auth-bypass',
};

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

AppAuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
  publishableKey: PropTypes.string,
  appearance: PropTypes.object,
};

export function Show({ when, children }) {
  if (!isDevAuthBypassEnabled()) {
    return <RealShow when={when}>{children}</RealShow>;
  }

  return when === 'signed-in' ? children : null;
}

Show.propTypes = {
  when: PropTypes.string.isRequired,
  children: PropTypes.node,
};

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

SignInButton.propTypes = {
  children: PropTypes.node,
};

// This adapter intentionally keeps Clerk components and its auth hook together.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  if (isDevAuthBypassEnabled()) {
    return DEV_AUTH_BYPASS_STATE;
  }

  // Dev UI bypass intentionally skips ClerkProvider, so the real hook is only safe in Clerk mode.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useRealAuth();
}
