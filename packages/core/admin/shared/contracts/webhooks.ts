import { errors } from '@strapi/utils';
import type { Modules } from '@strapi/types';

/**
 * /webhooks - GET all webhooks
 */
export declare namespace GetWebhooks {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: Modules.WebhookStore.Webhook[];
    error?: errors.ApplicationError;
  }
}

/**
 * GET /webhooks/:id - Get a webhook
 */
export declare namespace GetWebhook {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Modules.WebhookStore.Webhook['id'];
  }

  export interface Response {
    data: Modules.WebhookStore.Webhook;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /webhooks - Create a webhook
 */
export declare namespace CreateWebhook {
  export interface Request {
    body: Modules.WebhookStore.Webhook;
    query: {};
  }

  export interface Response {
    data: Modules.WebhookStore.Webhook;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * PUT /webhooks/:id - Update a webhook
 */
export declare namespace UpdateWebhook {
  export interface Request {
    body: Partial<Modules.WebhookStore.Webhook>;
    query: {};
  }

  export interface Params {
    id: Modules.WebhookStore.Webhook['id'];
  }

  export interface Response {
    data: Modules.WebhookStore.Webhook;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * DELETE /webhooks/:id - Delete a webhook
 */
export declare namespace DeleteWebhook {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Modules.WebhookStore.Webhook['id'];
  }

  export interface Response {
    data: Modules.WebhookStore.Webhook;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /webhooks/batch-delete' - Delete multiple webhooks
 */
export declare namespace DeleteWebhooks {
  export interface Request {
    body: {
      ids: Modules.WebhookStore.Webhook['id'][];
    };
    query: {};
  }

  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /webhooks/:id/trigger - Trigger a webhook
 */
export declare namespace TriggerWebhook {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Modules.WebhookStore.Webhook['id'];
  }

  export interface Response {
    data: {
      statusCode: number;
      message?: string;
    };
    error?: errors.ApplicationError;
  }
}
