import { errors } from '@strapi/utils';
import { ValidationError as YupValidationError } from 'yup';
import type { Webhook } from '@strapi/types';

/**
 * /listWebhooks - List all webhooks
 */
export declare namespace ListWebhooks {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: Webhook[];
    error?: errors.ApplicationError;
  }
}

/**
 * /getWebhook
 */
export declare namespace GetWebhook {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: string;
  }

  export interface Response {
    data: Webhook;
    error?: errors.ApplicationError;
  }
}

/**
 * /createWebhook - Create a webhook
 */
export declare namespace CreateWebhook {
  export interface Request {
    body: Webhook;
    query: {};
  }

  export interface Response {
    data: Webhook;
    error?: errors.ApplicationError | YupValidationError;
  }
}

/**
 * /updateWebhook - Update a webhook
 */
export declare namespace UpdateWebhook {
  export interface Request {
    body: Partial<Webhook>;
    query: {};
  }

  export interface Params {
    id: string;
  }

  export interface Response {
    data: Webhook;
    error?: errors.ApplicationError | YupValidationError;
  }
}

/**
 * /deleteWebhook - Delete a webhook
 */
// TODO types for id
export declare namespace DeleteWebhook {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: Webhook;
    error?: errors.ApplicationError;
  }
}

/**
 * /deleteWebhooks - Delete multiple webhooks
 */
export declare namespace DeleteWebhooks {
  export interface Request {
    body: {
      ids: string[];
    };
    query: {};
  }

  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * /triggerWebhook - Trigger a webhook
 */
export declare namespace TriggerWebhook {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: string;
  }

  export interface Response {
    // TODO type this
    data: unknown;
    error?: errors.ApplicationError;
  }
}
