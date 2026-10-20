import type { ParameterizedContext } from 'koa';

import type { RouteConfig, MiddlewareHandler } from '../core';
import type { IsStrict } from '../core/strictness';

/**
 * What `verify` resolves to: nothing when the route disables auth, otherwise what the strategy's
 * `verify` resolves to, if it has one (`packages/core/core/src/services/auth/index.ts:123-135`).
 * Strategies define it, so strict types resolve it to `unknown`; without them it stays `any`.
 */
type VerifyResult = IsStrict extends true ? unknown : any;

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
  verify?: (auth: AuthenticationInfo, config: RouteConfig['auth']) => Promise<VerifyResult>;
}

export interface AuthenticationService {
  register: (type: string, strategy: Strategy) => AuthenticationService;
  authenticate: MiddlewareHandler;
  verify: (auth: AuthenticationInfo, config?: RouteConfig['auth']) => Promise<VerifyResult>;
}
