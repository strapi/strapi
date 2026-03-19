/* eslint-disable @typescript-eslint/no-namespace */
import type { Schema } from './types/schema';

export const STRAPI_CODE_MIME_TYPE = 'application/vnd.strapi.code';
export const STRAPI_MAX_ATTACHMENTS = 15;
export const STRAPI_MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB

/* -------------------------------------------------------------------------------------------------
 * APIs
 * -----------------------------------------------------------------------------------------------*/
export const STRAPI_AI_URL =
  process.env.STRAPI_AI_URL?.replace(/\/+$/, '') ?? 'https://strapi-ai.apps.strapi.io';
export const STRAPI_AI_CHAT_URL = `${STRAPI_AI_URL}/schemas/chat`;
export const STRAPI_AI_TITLE_URL = `/schemas/chat/generate-title` as const;
export const STRAPI_AI_FEEDBACK_URL = `/schemas/chat/feedback` as const;
export const STRAPI_AI_PROJECT_URL = `/schemas/chat/attachment` as const;

// AI SDK will also send messages and other relevant data
export interface ChatBody {
  schemas: Schema[];
}
