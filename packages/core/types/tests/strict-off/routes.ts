import type { Core } from '../../src';
import type { Equal, Expect, SameValues } from './helpers';

// `Core.RouteConfig` keeps develop's `auth`: strategies by name only. `RouteConfigFor` also takes
// strategy objects.
type RouteAuthChecks = [
  Expect<
    Equal<Core.RouteConfig['auth'], false | { scope?: string[]; strategies?: string[] } | undefined>
  >,
];
declare const routeAuthChecks: RouteAuthChecks;
routeAuthChecks satisfies unknown;

// Route configs keep develop's types. Without strict types, `RouteConfigFor` accepts every route
// config develop accepts, and any policy name.
type RouteConfigChecks = [
  Expect<
    Equal<
      Core.RouteConfig,
      {
        prefix?: string;
        middlewares?: Array<string | Core.MiddlewareHandler>;
        policies?: Array<string | { name: string; config: unknown }>;
        auth?: false | { scope?: string[]; strategies?: string[] };
      }
    >
  >,
  Expect<Equal<Core.Route['config'], Core.RouteConfig | undefined>>,
  Expect<Equal<Core.RouteConfig extends Core.RouteConfigFor ? true : false, true>>,
  Expect<
    Equal<Core.RouteConfig extends Core.RouteConfigFor<'plugin::legacy'> ? true : false, true>
  >,
  Expect<
    SameValues<
      NonNullable<Core.RouteConfigFor['policies']>[number],
      string | { name: string; config: unknown }
    >
  >,
];
declare const routeConfigChecks: RouteConfigChecks;
routeConfigChecks satisfies unknown;
