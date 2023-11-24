import { Entity } from '@strapi/types';

export interface TransferToken {
  createdAt: string;
  description: string;
  expiresAt: null | string;
  id: Entity.ID;
  lastUsedAt: string | null;
  lifespan: string | null;
  name: string;
  permissions: Array<'push' | 'pull' | 'push-pull'>;
}

type UpdatePayload = Partial<
  Pick<TransferToken, 'description' | 'lifespan' | 'name' | 'permissions'>
>;

type CreateResponsePayload = TransferToken & {
  accessKey: string;
};

/**
 * GET /tokens/tokens/:id - Get single token
 */
export declare namespace Get {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: TransferToken;
  }
}

/**
 * POST /tokens/tokens - Create a single token
 */
export declare namespace Create {
  export interface Request {
    body: UpdatePayload;
    query: {};
  }

  export interface Response {
    data: CreateResponsePayload;
  }
}

/**
 * PUT /tokens/tokens/:id - Update a single token
 */
export declare namespace Update {
  export interface Request {
    body: UpdatePayload;
    query: {};
  }

  export interface Response {
    data: TransferToken;
  }
}
