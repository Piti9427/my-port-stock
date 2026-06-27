'use strict';

const { getAuth } = require('@clerk/express');

const DEV_UI_AUTH_BYPASS_TOKEN = 'dev-ui-auth-bypass';
const DEV_UI_USER_ID = 'dev-ui-user';

function isDevUiAuthBypassEnabled(env = process.env) {
  return env.NODE_ENV !== 'production' && env.DEV_UI_AUTH_BYPASS === 'true';
}

function getBearerToken(req) {
  const header = req.get?.('authorization') || req.headers?.authorization;
  if (typeof header !== 'string') return null;

  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

function isDevUiAuthBypassRequest(req, env = process.env) {
  return (
    isDevUiAuthBypassEnabled(env) &&
    getBearerToken(req) === DEV_UI_AUTH_BYPASS_TOKEN
  );
}

function applyDevUiAuthBypass(req, env = process.env) {
  if (!isDevUiAuthBypassRequest(req, env)) {
    return false;
  }

  req.auth = { userId: DEV_UI_USER_ID };
  return true;
}

function getRequestUserId(req) {
  if (isDevUiAuthBypassRequest(req)) {
    return DEV_UI_USER_ID;
  }

  if (req.auth?.userId) return req.auth.userId;
  if (typeof req.auth === 'function') {
    try {
      return req.auth()?.userId || null;
    } catch (err) {
      console.error('Error resolving request auth userId:', err);
      return null;
    }
  }

  try {
    return getAuth(req).userId || null;
  } catch (err) {
    console.error('Error resolving Clerk auth userId:', err.message);
  }

  return null;
}

module.exports = {
  DEV_UI_AUTH_BYPASS_TOKEN,
  DEV_UI_USER_ID,
  applyDevUiAuthBypass,
  getRequestUserId,
  isDevUiAuthBypassEnabled,
  isDevUiAuthBypassRequest,
};
