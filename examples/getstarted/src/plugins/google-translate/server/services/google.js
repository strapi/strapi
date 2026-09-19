'use strict';

const crypto = require('crypto');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const TRANSLATE_SCOPE = 'https://www.googleapis.com/auth/cloud-translation';

const LOCALE_ALIASES = {
  'zh-hans': 'zh-CN',
  'zh-hant': 'zh-TW',
  zh: 'zh-CN',
  'en-gb': 'en',
  'en-us': 'en',
};

const REGIONAL_GOOGLE_LOCALES = new Set(['zh-CN', 'zh-TW', 'pt-BR', 'pt-PT']);

const tokenCache = {
  token: null,
  expiresAt: 0,
  email: null,
};

const toBase64Url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const toGoogleLocale = (locale) => {
  if (!locale) {
    return locale;
  }

  const lower = String(locale).toLowerCase();
  if (LOCALE_ALIASES[lower]) {
    return LOCALE_ALIASES[lower];
  }

  const parts = String(locale).split('-');
  if (parts.length >= 2) {
    const regional = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
    if (REGIONAL_GOOGLE_LOCALES.has(regional)) {
      return regional;
    }
    return parts[0].toLowerCase();
  }

  return lower;
};

const createServiceAccountJwt = (credentialsJson) => {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: credentialsJson.client_email,
      scope: TRANSLATE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = toBase64Url(signer.sign(credentialsJson.private_key));
  return `${unsigned}.${signature}`;
};

const getAccessToken = async (credentialsJson) => {
  const now = Date.now();
  if (
    tokenCache.token &&
    tokenCache.email === credentialsJson.client_email &&
    tokenCache.expiresAt > now + 60_000
  ) {
    return tokenCache.token;
  }

  const assertion = createServiceAccountJwt(credentialsJson);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Failed to get Google access token');
  }

  tokenCache.token = payload.access_token;
  tokenCache.email = credentialsJson.client_email;
  tokenCache.expiresAt = now + (payload.expires_in || 3600) * 1000;
  return payload.access_token;
};

const parseGoogleError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.error_description || JSON.stringify(payload);
  } catch {
    return response.statusText;
  }
};

const translateWithApiKey = async ({ apiKey, texts, source, target, format }) => {
  const url = `${TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source, target, format }),
  });

  if (!response.ok) {
    throw new Error(`Google Translate API failed (${response.status}): ${await parseGoogleError(response)}`);
  }

  const payload = await response.json();
  return payload.data.translations.map((item) => item.translatedText);
};

const translateWithAccessToken = async ({ accessToken, texts, source, target, format }) => {
  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ q: texts, source, target, format }),
  });

  if (!response.ok) {
    throw new Error(`Google Translate API failed (${response.status}): ${await parseGoogleError(response)}`);
  }

  const payload = await response.json();
  return payload.data.translations.map((item) => item.translatedText);
};

const chunk = (items, size) => {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
};

module.exports = ({ strapi }) => ({
  toGoogleLocale,

  async translateTexts({ texts, sourceLocale, targetLocale, format = 'text' }) {
    const credentials = await strapi.plugin('google-translate').service('credentials').get();

    if (!credentials) {
      throw new Error('Google Translate credentials are not configured. Add them in Settings.');
    }

    const source = toGoogleLocale(sourceLocale);
    const target = toGoogleLocale(targetLocale);
    const googleFormat = format === 'html' ? 'html' : 'text';
    const input = Array.isArray(texts) ? texts : [texts];
    const results = [];

    for (const group of chunk(input, 128)) {
      if (credentials.kind === 'apiKey') {
        results.push(
          ...(await translateWithApiKey({
            apiKey: credentials.apiKey,
            texts: group,
            source,
            target,
            format: googleFormat,
          }))
        );
      } else {
        const accessToken = await getAccessToken(credentials.json);
        results.push(
          ...(await translateWithAccessToken({
            accessToken,
            texts: group,
            source,
            target,
            format: googleFormat,
          }))
        );
      }
    }

    return Array.isArray(texts) ? results : results[0];
  },
});
