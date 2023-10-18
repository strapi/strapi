export type ApiTokenPermission = {
  id: number | `${number}`;
  action: string;
  token: ApiToken | number;
};

export type ApiToken = {
  id?: number | `${number}`;
  name: string;
  description: string;
  accessKey: string;
  lastUsedAt: number;
  lifespan: number | null;
  expiresAt: number;
  type: 'read-only' | 'full-access' | 'custom';
  permissions: (number | ApiTokenPermission)[];
};

type ApiTokenBody = Pick<ApiToken, 'lifespan' | 'description' | 'type' | 'name' | 'permissions'>;
type ApiTokenResponse = Omit<ApiToken, 'accessKey'>;

/**
 * POST /api-tokens - Create an api token
 */
export declare namespace Create {
  export interface Request {
    body: ApiTokenBody;
  }

  export interface Response {
    data: ApiToken;
  }
}

/**
 * GET /api-tokens - List api tokens
 */
export declare namespace List {
  export interface Request {
    body: {};
  }

  export interface Response {
    data: ApiTokenResponse[];
  }
}

/**
 * DELETE /api-tokens/:id - Delete an API token
 */
export declare namespace Revoke {
  export interface Request {
    body: {};
  }

  export interface Params {
    id: number;
  }

  export interface Response {
    data: ApiTokenResponse;
  }
}

/**
 * GET /api-tokens/:id - Get an API token
 */
export declare namespace Get {
  export interface Request {
    body: {};
  }

  export interface Params {
    id: number;
  }

  export interface Response {
    data: ApiTokenResponse;
  }
}

/**
 * POST /api-tokens/:id - Update an API token
 */
export declare namespace Update {
  export interface Request {
    body: ApiTokenBody;
  }

  export interface Params {
    id: number;
  }

  export interface Response {
    data: ApiTokenResponse;
  }
}
