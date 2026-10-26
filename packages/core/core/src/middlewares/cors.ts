import koaCors from '@koa/cors';

import type { Core } from '@strapi/types';

export type Config = {
  enabled?: boolean;
  origin: string | string[] | ((ctx: any) => string | string[] | Promise<string | string[]>);
  expose?: string | string[];
  maxAge?: number;
  credentials?: boolean;
  methods?: string | string[];
  headers?: string | string[];
  keepHeadersOnError?: boolean;
};

const defaults: Config = {
  origin: '*',
  maxAge: 31536000,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  keepHeadersOnError: false,
};

/**
 * Determines if a request origin is allowed based on the configured origin list
 * @param requestOrigin - The origin from the request header
 * @param configuredOrigin - The origin configuration (string, array, or function)
 * @param ctx - The Koa context (for function-based origin)
 * @returns The allowed origin string or empty string if blocked
 */
export const matchOrigin = async (
  requestOrigin: string | undefined,
  configuredOrigin:
    | string
    | string[]
    | ((ctx: any) => string | string[] | Promise<string | string[]>),
  ctx?: any
): Promise<string> => {
  if (!requestOrigin) {
    return '*';
  }

  let originList: string | string[];

  if (typeof configuredOrigin === 'function') {
    originList = await configuredOrigin(ctx);
  } else {
    originList = configuredOrigin;
  }

  // Normalize originList into an array
  let normalizedOrigins: string[];
  if (Array.isArray(originList)) {
    normalizedOrigins = originList;
  } else if (originList === undefined || originList === null) {
    // Handle undefined/null - treat as wildcard
    normalizedOrigins = ['*'];
  } else {
    // Handle comma-separated string of origins
    normalizedOrigins = originList.split(',').map((origin) => origin.trim());
  }

  // Check if wildcard is in the normalized origins
  if (normalizedOrigins.includes('*')) {
    return requestOrigin;
  }

  // Check if request origin is in the normalized origins
  return normalizedOrigins.includes(requestOrigin) ? requestOrigin : '';
};

export const cors: Core.MiddlewareFactory<Config> = (config) => {
  const { origin, expose, maxAge, credentials, methods, headers, keepHeadersOnError } = {
    ...defaults,
    ...config,
  };

  if (config.enabled !== undefined) {
    strapi.log.warn(
      'The strapi::cors middleware no longer supports the `enabled` option. Using it' +
        ' to conditionally enable CORS might cause an insecure default. To disable strapi::cors, remove it from' +
        ' the exported array in config/middleware.js'
    );
  }

  return koaCors({
    async origin(ctx) {
      const requestOrigin = ctx.get('Origin');
      return matchOrigin(requestOrigin, origin, ctx);
    },
    exposeHeaders: expose,
    maxAge,
    credentials,
    allowMethods: methods,
    allowHeaders: headers,
    keepHeadersOnError,
  });
};
