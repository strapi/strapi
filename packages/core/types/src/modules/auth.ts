import type { ParameterizedContext } from 'koa';

import type { RouteConfig, MiddlewareHandler } from '../core';

interface AuthenticationResponse {
  authenticated?: boolean;
  credentials?: unknown;
  ability?: unknown;
  error?: Error | null;
}

interface AuthenticationInfo {
  strategy: Strategy;
  credentials: unknown;
  ability: unknown;
}

interface Strategy {
  name: string;
  authenticate: (ctx: ParameterizedContext) => Promise<AuthenticationResponse>;
  verify?: (auth: AuthenticationInfo, config: RouteConfig['auth']) => Promise<any>;
}

export interface AuthenticationService {
  register: (type: string, strategy: Strategy) => AuthenticationService;
  authenticate: MiddlewareHandler;
  verify: (auth: AuthenticationInfo, config?: RouteConfig['auth']) => Promise<any>;
}
