/* eslint-disable @typescript-eslint/no-namespace */

/**
 * In charge of fetching data from Strapi AI endpoints
 */

import { useState } from 'react';

import { Message, useChat } from '@ai-sdk/react';
import { useAppInfo } from '@strapi/admin/strapi-admin';

import { STRAPI_AI_CHAT_URL, STRAPI_AI_TOKEN, STRAPI_AI_URL } from '../lib/constants';
import { Attachment } from '../lib/types/attachments';
import { Schema } from '../lib/types/schema';

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
     * Make a type-safe API call to the specified Strapi AI endpoint
     */
    const fetchData = async (
      options: Omit<RequestInit, 'body'> & Partial<RequestType<T>> & { formData?: FormData } = {}
    ): Promise<ResponseType<T> | null> => {
      setIsPending(true);
      setError(null);

      try {
        const headers = {
          Authorization: `Bearer ${STRAPI_AI_TOKEN}`,
          'X-Strapi-Version': strapiVersion || 'latest',
          'X-Strapi-User': userId || 'unknown',
          'X-Strapi-Project-Id': projectId || 'unknown',
          ...options.headers,
        } as Record<string, string>;

        if (options.body) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${STRAPI_AI_URL}${endpoint}`, {
          method: 'POST',
          headers,
          body: options.formData ? options.formData : JSON.stringify(options.body || {}),
        });

        const body = await response.json();

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

  return useChat({
    ...props,
    api: STRAPI_AI_CHAT_URL,
    headers: {
      Authorization: `Bearer ${STRAPI_AI_TOKEN}`,
      'X-Strapi-Version': strapiVersion || 'latest',
      'X-Strapi-User': userId || 'unknown',
      'X-Strapi-Project-Id': projectId || 'unknown',
      ...(props?.headers || {}),
    },
  });
};
