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

  // Handle arrays of origins
  if (Array.isArray(originList)) {
    // Check if wildcard is in the array
    if (originList.includes('*')) {
      return requestOrigin;
    }
    return originList.includes(requestOrigin) ? requestOrigin : '';
  }

  // Handle comma-separated string of origins
  const parsedOrigin = originList.split(',').map((origin) => origin.trim());
  if (parsedOrigin.length > 1) {
    // Check if wildcard is in the comma-separated list
    if (parsedOrigin.includes('*')) {
      return requestOrigin;
    }
    return parsedOrigin.includes(requestOrigin) ? requestOrigin : '';
  }

  // Handle string of one origin with exact match
  if (typeof originList === 'string') {
    // Handle wildcard origin
    if (originList === '*') {
      return requestOrigin;
    }
    return originList === requestOrigin ? requestOrigin : '';
  }

  // block the request
  return '';
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
