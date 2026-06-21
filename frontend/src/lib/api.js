export class ApiError extends Error {
  constructor(message, { status = 0, payload = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.cause = cause;
  }
}

async function parsePayload(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildBodyAndHeaders(body, headers) {
  if (body === undefined || body === null) {
    return { body: undefined, headers };
  }

  if (typeof body === 'string' || body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams) {
    return { body, headers };
  }

  return {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
}

function messageFromPayload(payload, fallback) {
  if (payload && typeof payload === 'object') {
    return payload.error_details || payload.error || payload.message || fallback;
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  return fallback;
}

export async function fetchWithAuth(url, getToken, options = {}) {
  const { body, headers: optionHeaders = {}, method = body === undefined ? 'GET' : 'POST', signal, ...rest } = options;

  const token = typeof getToken === 'function' ? await getToken() : null;
  const headers = {
    ...optionHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const request = buildBodyAndHeaders(body, headers);

  let response;
  try {
    response = await fetch(url, {
      ...rest,
      method,
      headers: request.headers,
      body: request.body,
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(error?.message || 'Network request failed', {
      status: 0,
      cause: error,
    });
  }

  const payload = await parsePayload(response);

  if (!response.ok) {
    throw new ApiError(messageFromPayload(payload, response.statusText || 'API Error'), {
      status: response.status,
      payload,
    });
  }

  return payload;
}
