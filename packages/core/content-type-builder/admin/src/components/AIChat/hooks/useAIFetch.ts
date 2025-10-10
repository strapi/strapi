/* eslint-disable @typescript-eslint/no-namespace */

/**
 * In charge of fetching data from Strapi AI endpoints
 */

import { useState } from 'react';

import { UIMessage, useChat } from '@ai-sdk/react';
import { useAppInfo } from '@strapi/admin/strapi-admin';
import { useGetAIUsageQuery } from '@strapi/admin/strapi-admin/ee';
import { DefaultChatTransport } from 'ai';

import { fetchAI, makeChatFetch, safeParseJson } from '../lib/aiClient';
import { STRAPI_AI_CHAT_URL, STRAPI_AI_URL } from '../lib/constants';
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
      messages: UIMessage[];
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
export const LICENSE_LIMIT_EXCEEDED_ERROR = 'AI credit limit exceeded';
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
    const aiUsage = useGetAIUsageQuery(undefined, { refetchOnMountOrArgChange: true });

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Make a type-safe API call to the specified Strapi AI endpoint with retry logic
     */
    const fetchData = async (
      options: Omit<RequestInit, 'body'> & Partial<RequestType<T>> & { formData?: FormData } = {}
    ): Promise<ResponseType<T> | null> => {
      setIsPending(true);
      setError(null);

      try {
        const fullUrl = `${STRAPI_AI_URL}${endpoint}`;
        const isJson = !!options.body && !options.formData;

        const response = await fetchAI(fullUrl, {
          method: 'POST',
          headers: isJson
            ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
            : options.headers,
          body: options.formData
            ? options.formData
            : isJson
              ? JSON.stringify(options.body || {})
              : undefined,
          ctx: { strapiVersion, projectId, userId },
        });
        // refetch ai usage data on every successful request
        aiUsage.refetch();

        const body = await safeParseJson(response);

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

/**
 * Hook wrapper for AI SDK's useChat with Strapi-specific configuration
 */
export const useAIChat: typeof useChat = (props) => {
  const strapiVersion = useAppInfo('useAIChat', (state) => state.strapiVersion);
  const projectId = useAppInfo('useAIFetch', (state) => state.projectId);
  const userId = useAppInfo('useAIChat-user', (state) => state.userId);

  const customFetch = makeChatFetch({ strapiVersion, projectId, userId });

  return useChat({
    ...props,
    transport: new DefaultChatTransport({
      api: STRAPI_AI_CHAT_URL,
      fetch: customFetch,
    }),
  });
};
