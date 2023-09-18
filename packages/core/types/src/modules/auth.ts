import type { ParameterizedContext } from 'koa';
import type { Common } from '../types';

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
  verify?: (auth: AuthenticationInfo, config: Common.RouteConfig['auth']) => Promise<any>;
}

export interface AuthenticationService {
  register: (type: string, strategy: Strategy) => AuthenticationService;
  authenticate: Common.MiddlewareHandler;
  verify: (auth: AuthenticationInfo, config?: Common.RouteConfig['auth']) => Promise<any>;
}
