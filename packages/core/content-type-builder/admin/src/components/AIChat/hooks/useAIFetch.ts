/* eslint-disable @typescript-eslint/no-namespace */

/**
 * In charge of fetching data from Strapi AI endpoints
 */

import { useState } from 'react';

import { Message, useChat } from '@ai-sdk/react';
import { useAppInfo, getFetchClient } from '@strapi/admin/strapi-admin';

import { STRAPI_AI_CHAT_URL, STRAPI_AI_URL } from '../lib/constants';
import { Attachment } from '../lib/types/attachments';
import { Schema } from '../lib/types/schema';

/* -------------------------------------------------------------------------------------------------
 * AI Token Management
 * -----------------------------------------------------------------------------------------------*/
interface AITokenData {
  token: string;
  expiresAt: string;
}

let aiTokenCache: AITokenData | null = null;

const isTokenExpired = (expiresAt: string): boolean => {
  // Add 1 minute buffer before expiration
  const bufferMs = 60 * 1000;
  return new Date(expiresAt).getTime() - bufferMs <= Date.now();
};

const storeAIToken = (tokenData: AITokenData) => {
  aiTokenCache = tokenData;
  // Optional: also store in sessionStorage for persistence across components
  sessionStorage.setItem('strapi-ai-token', JSON.stringify(tokenData));
};

const getStoredAIToken = (): AITokenData | null => {
  // First check memory cache
  if (aiTokenCache && !isTokenExpired(aiTokenCache.expiresAt)) {
    return aiTokenCache;
  }

  // Then check sessionStorage
  const stored = sessionStorage.getItem('strapi-ai-token');
  if (stored) {
    try {
      const tokenData = JSON.parse(stored) as AITokenData;
      if (!isTokenExpired(tokenData.expiresAt)) {
        aiTokenCache = tokenData; // Update memory cache
        return tokenData;
      }
    } catch {}
  }

  return null;
};

// Fetch AI token on initial load
export const prefetchAIToken = async () => {
  try {
    // Check for fallback first
    if (window.strapi?.aiLicenseKey) {
      return;
    }

    // Check if we already have a valid token
    const existingToken = getStoredAIToken();
    if (existingToken) {
      return; // Token exists and is valid, no need to fetch
    }

    // Get admin token
    const getAdminToken = () => {
      const fromLocalStorage = localStorage.getItem('jwtToken');
      if (fromLocalStorage) {
        try {
          return JSON.parse(fromLocalStorage);
        } catch {
          return fromLocalStorage;
        }
      }

      // Check cookies as fallback
      const getCookieValue = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      return getCookieValue('jwtToken');
    };

    const adminToken = getAdminToken();
    if (!adminToken) return;

    const response = await fetch('/admin/users/me/ai-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const token = data?.token || data?.data?.token;
      const expiresAt = data?.expiresAt || data?.data?.expiresAt;

      if (token && expiresAt) {
        storeAIToken({ token, expiresAt });
      }
    }
  } catch {
    // Silently fail - fallback will be used
  }
};

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/
/**
 * Chat title
 */
export namespace GenerateTitle {
  export interface Request {
    body: {
      chatId: string;
      message: string;
    };
  }
  export interface Response {
    data: {
      title: string;
    };
    error?: string;
  }
}

/**
 * Upload a project to the chat
 */
export namespace UploadProject {
  export interface Request {
    body: {
      chatId: string;
      name: string;
      type: 'code';
      files: {
        path: string;
        content: string;
      }[];
    };
  }
  export interface Response {
    data: Attachment;
    error?: string;
  }
}

/**
 * Send chat feedback
 */
export type FeedbackReasonIds =
  | 'invalid_schema'
  | 'bad_recommendation'
  | 'slow'
  | 'instructions_ignored'
  | 'being_lazy'
  | 'other';

namespace SendFeedback {
  export interface Request {
    body: {
      chatId: string;
      type: 'upvote' | 'downvote';
      feedback?: string;
      reasons?: FeedbackReasonIds[];
      messageId: string;
      messages: Message[];
      schemas: Schema[];
    };
  }
}

/**
 * Upload media
 */
export namespace UploadMedia {
  export interface Request {
    body: {
      url: string; // base64 image
      filename: string;
      chatId: string;
    };
  }
  export interface Response {
    data: Attachment;
    error?: string;
  }
}

/**
 * Collection of API endpoints and their corresponding request/response types
 */
type AIEndpoints = {
  '/schemas/chat/generate-title': {
    request: GenerateTitle.Request;
    response: GenerateTitle.Response;
  };
  '/schemas/chat/attachment': {
    request: UploadProject.Request;
    response: UploadProject.Response;
  };
  '/schemas/chat/feedback': {
    request: SendFeedback.Request;
    response: void;
  };
  '/media/upload': {
    request: UploadMedia.Request;
    response: UploadMedia.Response;
  };
};

// Helper type to extract the request type for a given endpoint
type RequestType<T extends keyof AIEndpoints> = AIEndpoints[T]['request'];

// Helper type to extract the response type for a given endpoint
type ResponseType<T extends keyof AIEndpoints> = AIEndpoints[T]['response'];

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * -----------------------------------------------------------------------------------------------*/

export const TOO_MANY_REQUESTS_ERROR = 'Too many requests';
export const LICENSE_LIMIT_REACHED_ERROR = 'License limit';
export const CHAT_TOO_LONG_ERROR = 'Chat too long';
export const ATTACHMENT_TOO_BIG_ERROR = 'Attachment too big';
export const ATTACHMENT_NOT_FOUND_ERROR = 'Attachment not found';
export const INVALID_REQUEST_ERROR = 'Invalid request';

/**
 * Base hook factory for making type-safe API calls to Strapi AI endpoints.
 * Creates a hook specific to a single endpoint.
 */
export const createAIFetchHook = <T extends keyof AIEndpoints>(endpoint: T) => {
  return () => {
    const strapiVersion = useAppInfo('useAIFetch', (state) => state.strapiVersion);
    const projectId = useAppInfo('useAIFetch', (state) => state.projectId);
    const userId = useAppInfo('useAIFetch-user', (state) => state.userId);

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Get AI token - check stored, fallback, or fetch new
     */
    const getAIToken = async (): Promise<string | null> => {
      try {
        // 1. Check for fallback STRAPI_AI_TOKEN first
        const fallbackToken = window.strapi?.aiLicenseKey;
        if (fallbackToken) {
          return fallbackToken;
        }

        // 2. Check for stored valid token
        const storedToken = getStoredAIToken();
        if (storedToken) {
          return storedToken.token;
        }

        // 3. Fetch new token
        const getAdminToken = () => {
          const STORAGE_KEYS = { TOKEN: 'jwtToken' };

          const fromLocalStorage = localStorage.getItem(STORAGE_KEYS.TOKEN);

          if (fromLocalStorage) {
            try {
              const parsed = JSON.parse(fromLocalStorage);
              return parsed;
            } catch (e) {
              return fromLocalStorage;
            }
          }

          // Also try cookies as fallback
          const fromCookie = document.cookie
            .split(';')
            .find((row) => row.trim().startsWith('jwtToken='));

          return fromCookie ? fromCookie.split('=')[1] : null;
        };

        const adminToken = getAdminToken();

        if (!adminToken) {
          return null;
        }

        const response = await fetch('/admin/users/me/ai-token', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        });

        if (!response.ok) {
          await response.text();
          return null;
        }

        const data = await response.json();

        const token = data?.token || data?.data?.token;
        const expiresAt = data?.expiresAt || data?.data?.expiresAt;

        // Store the token for future use
        if (token && expiresAt) {
          storeAIToken({ token, expiresAt });
        }

        return token || null;
      } catch (error) {
        return null;
      }
    };

    /**
     * Make a type-safe API call to the specified Strapi AI endpoint with retry logic
     */
    const fetchData = async (
      options: Omit<RequestInit, 'body'> & Partial<RequestType<T>> & { formData?: FormData } = {},
      isRetry = false
    ): Promise<ResponseType<T> | null> => {
      setIsPending(true);
      setError(null);

      try {
        // Get AI token
        const aiToken = await getAIToken();
        if (!aiToken) {
          setError('No AI token available. Please ensure you have Enterprise Edition license.');
          return null;
        }

        const makeRequest = async (token: string) => {
          const headers = {
            Authorization: `Bearer ${token}`,
            'X-Strapi-Version': strapiVersion || 'latest',
            'X-Strapi-User': userId || 'unknown',
            'X-Strapi-Project-Id': projectId || 'unknown',
            ...options.headers,
          } as Record<string, string>;

          if (options.body) {
            headers['Content-Type'] = 'application/json';
          }

          const fullUrl = `${STRAPI_AI_URL}${endpoint}`;

          return fetch(fullUrl, {
            method: 'POST',
            headers,
            body: options.formData ? options.formData : JSON.stringify(options.body || {}),
          });
        };

        const response = await makeRequest(aiToken);
        const body = await response.json();

        // Check for token expired error and retry once
        if (
          !isRetry &&
          (response.status === 401 ||
            body.error?.toLowerCase().includes('expired') ||
            body.error?.toLowerCase().includes('invalid token'))
        ) {
          // Clear stored token
          aiTokenCache = null;
          sessionStorage.removeItem('strapi-ai-token');

          // Get new token
          const newToken = await getAIToken();
          if (newToken && newToken !== aiToken) {
            // Retry with new token
            return fetchData(options, true);
          }
        }

        if (!response.ok && body.error) {
          setError(body.error);
          return body;
        }

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        return body as ResponseType<T>;
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to fetch data from ${endpoint}`);
        return null;
      } finally {
        setIsPending(false);
      }
    };

    return {
      isPending,
      error,
      fetch: fetchData,
    };
  };
};

// Create specific hooks for each endpoint
export const useFetchGenerateTitle = createAIFetchHook('/schemas/chat/generate-title');
export const useFetchUploadProject = createAIFetchHook('/schemas/chat/attachment');
export const useFetchSendFeedback = createAIFetchHook('/schemas/chat/feedback');
export const useFetchUploadMedia = createAIFetchHook('/media/upload');
export const useAIFetch = (endpoint: keyof AIEndpoints) => createAIFetchHook(endpoint);

/**
 * Hook wrapper for AI SDK's useChat with Strapi-specific configuration
 */
export const useAIChat: typeof useChat = (props) => {
  const strapiVersion = useAppInfo('useAIChat', (state) => state.strapiVersion);
  const projectId = useAppInfo('useAIFetch', (state) => state.projectId);
  const userId = useAppInfo('useAIChat-user', (state) => state.userId);

  // Custom fetch function that gets AI token dynamically with retry logic
  const customFetch = async (
    input: string | URL | Request,
    options: RequestInit = {},
    isRetry = false
  ): Promise<Response> => {
    try {
      // 1. Check for fallback STRAPI_AI_TOKEN first
      const fallbackToken = window.strapi?.aiLicenseKey;
      if (fallbackToken) {
        const headers = {
          ...options.headers,
          Authorization: `Bearer ${fallbackToken}`,
          'X-Strapi-Version': strapiVersion || 'latest',
          'X-Strapi-User': userId || 'unknown',
          'X-Strapi-Project-Id': projectId || 'unknown',
        };

        return fetch(input, {
          ...options,
          headers,
        });
      }

      // 2. Check for stored valid token
      const storedToken = getStoredAIToken();
      let aiToken = storedToken?.token;

      // 3. Fetch new token if needed
      if (!aiToken) {
        try {
          const { get } = getFetchClient();
          const { data } = await get('/admin/users/me/ai-token');

          const token = data?.token || data?.data?.token;
          const expiresAt = data?.expiresAt || data?.data?.expiresAt;

          if (token && expiresAt) {
            storeAIToken({ token, expiresAt });
            aiToken = token;
          }
        } catch (error) {
          throw new Error('Failed to get AI token from admin endpoint');
        }
      }

      if (!aiToken) {
        throw new Error(
          'No AI token available. Please ensure you have Enterprise Edition license.'
        );
      }

      // Make the request
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${aiToken}`,
        'X-Strapi-Version': strapiVersion || 'latest',
        'X-Strapi-User': userId || 'unknown',
        'X-Strapi-Project-Id': projectId || 'unknown',
      };

      const response = await fetch(input, {
        ...options,
        headers,
      });

      // Check for token expiration and retry once
      if (!isRetry && (response.status === 401 || response.status === 403)) {
        const clonedResponse = response.clone();
        try {
          const body = await clonedResponse.json();
          if (
            body.error?.toLowerCase().includes('expired') ||
            body.error?.toLowerCase().includes('invalid token')
          ) {
            // Clear stored token
            aiTokenCache = null;
            sessionStorage.removeItem('strapi-ai-token');
            // Retry with new token
            return customFetch(input, options, true);
          }
        } catch {}
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  return useChat({
    ...props,
    api: STRAPI_AI_CHAT_URL,
    fetch: customFetch,
  });
};
