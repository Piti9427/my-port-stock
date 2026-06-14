import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

Sentry.init({
  dsn: 'https://c038399c574a158223ebf06aea9b83e8@o4511540696383488.ingest.us.sentry.io/4511563906678784',

  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],

  tracesSampleRate: 1.0,

  tracePropagationTargets: [/^\//, /^https:\/\/.*\.supabase\.co/],
});
