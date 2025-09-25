import { getFetchClient } from '@strapi/admin/strapi-admin';

/**
 * Centralized AI client utilities:
 * - Token retrieval via admin endpoint using getFetchClient
 * - In-memory + sessionStorage caching with near-expiry buffer
 * - Safe JSON parsing for error handling
 * - Single-retry policy on token invalidation
 */

export interface AITokenData {
  token: string;
  expiresAt: string;
}

let aiTokenCache: AITokenData | null = null;
const SESSION_STORAGE_KEY = 'strapi-ai-token';
const EXPIRY_BUFFER_MS = 60 * 1000;

const parseExpiryMs = (expiresAt: string): number | null => {
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) ? ms : null;
};

type TokenState = 'valid' | 'stale' | 'expired';

const getTokenState = (
  expiresAt: string,
  bufferMs = EXPIRY_BUFFER_MS,
  now = Date.now()
): TokenState => {
  const expMs = parseExpiryMs(expiresAt);
  if (expMs === null) {
    return 'expired';
  }
  if (expMs <= now) {
    return 'expired';
  }
  if (expMs - bufferMs <= now) {
    return 'stale';
  }

  return 'valid';
};

const isTokenUsable = (expiresAt: string, bufferMs = EXPIRY_BUFFER_MS, now = Date.now()): boolean =>
  getTokenState(expiresAt, bufferMs, now) === 'valid';

export const clearAIJwt = () => {
  aiTokenCache = null;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

const readFromSession = (): AITokenData | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AITokenData;
    return parsed;
  } catch {
    return null;
  }
};

const writeToSession = (data: AITokenData) => {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
};

export const getAIJwt = async (): Promise<AITokenData | null> => {
  // Check memory cache
  if (aiTokenCache && isTokenUsable(aiTokenCache.expiresAt)) {
    return aiTokenCache;
  }

  // Check session storage
  const fromSession = readFromSession();
  if (fromSession && isTokenUsable(fromSession.expiresAt)) {
    aiTokenCache = fromSession;

    return aiTokenCache;
  }

  // Fetch from admin endpoint
  try {
    const { get } = getFetchClient();
    const { data } = await get('/admin/ai-token');

    const token = data?.token || data?.data?.token;
    const expiresAt = data?.expiresAt || data?.data?.expiresAt;

    if (token && expiresAt) {
      aiTokenCache = { token, expiresAt };
      writeToSession(aiTokenCache);

      return aiTokenCache;
    }
    return null;
  } catch {
    return null;
  }
};

export const prefetchAIToken = async (): Promise<void> => {
  try {
    // If we already have a valid token (not expiring soon), do nothing
    const existing = await getAIJwt();
    if (existing) {
      return;
    }

    // Attempt a fetch to populate cache
    await getAIJwt();
  } catch {
    // no-op
  }
};

export const safeParseJson = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();

      return { error: text };
    } catch {
      return undefined;
    }
  }
};

export interface StrapiContextHeaders {
  strapiVersion?: string | null;
  projectId?: string | null;
  userId?: string | null;
}

const buildHeaders = (
  token: string,
  ctx?: StrapiContextHeaders,
  extra?: HeadersInit
): Record<string, string> => {
  return {
    Authorization: `Bearer ${token}`,
    'X-Strapi-Version': ctx?.strapiVersion || 'latest',
    'X-Strapi-User': ctx?.userId || 'unknown',
    'X-Strapi-Project-Id': ctx?.projectId || 'unknown',
    ...(extra as Record<string, string>),
  };
};

const shouldRetryForToken = (status: number, body: any): boolean => {
  if (status === 401 || status === 403) {
    return true;
  }

  const msg = (body?.error || '').toString().toLowerCase();
  return msg.includes('expired') || msg.includes('invalid token');
};

export interface FetchAIOptions extends RequestInit {
  ctx?: StrapiContextHeaders;
}

/**
 * Generic fetch wrapper for AI endpoints with token injection and single retry on invalidation
 */
export const fetchAI = async (
  input: RequestInfo | URL,
  options: FetchAIOptions = {}
): Promise<Response> => {
  // Get token
  const tokenData = await getAIJwt();

  if (!tokenData?.token) {
    const error = new Error(
      'Could not authorize with AI Server. Please contact your administrator.'
    );

    throw error;
  }

  const make = async (token: string): Promise<Response> => {
    const headers = buildHeaders(token, options.ctx, options.headers);
    return fetch(input, {
      ...options,
      headers,
    });
  };

  let response = await make(tokenData.token);

  let body: unknown | undefined = undefined;
  try {
    body = await safeParseJson(response.clone());
  } catch {
    // no-op
  }

  if (shouldRetryForToken(response.status, body)) {
    clearAIJwt();

    const refreshed = await getAIJwt();

    if (refreshed?.token && refreshed.token !== tokenData.token) {
      response = await make(refreshed.token);
    }
  }

  return response;
};

/**
 * Factory to provide a fetch implementation compatible with AI SDK useChat
 * that injects AI JWT + Strapi context headers and retries on token invalidation once.
 */
export const makeChatFetch = (ctx: StrapiContextHeaders) => {
  return async (input: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
    return fetchAI(input, { ...options, ctx });
  };
};
