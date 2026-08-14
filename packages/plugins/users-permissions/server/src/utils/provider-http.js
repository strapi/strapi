'use strict';

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';

  let body;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null
        ? body.error_description || body.error || body.message
        : body;
    throw new Error(message || `HTTP ${response.status}`);
  }

  return { body };
};

const bearerGet = (url, accessToken, { headers = {}, qs = {} } = {}) => {
  const target = new URL(url);
  Object.entries(qs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      target.searchParams.set(key, String(value));
    }
  });

  return fetchJson(target, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
  });
};

module.exports = {
  fetchJson,
  bearerGet,
};
