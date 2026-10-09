// Strict-off parity: the root config (`strapi.config`, `Core.ConfigProvider`) as develop apps use it.
// Compiled against develop too, so every expected error below is one develop reports.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const strapi: Core.Strapi;
declare const anyFn: (...args: any[]) => any; // `jest.fn()`-like

// Mocks.
app.config.get = anyFn;
const configMock: Core.ConfigProvider['get'] = anyFn;
const partial: Partial<Core.Strapi> = {
  config: {
    get: () => undefined,
    set() {
      return this;
    },
    has: () => false,
  } as unknown as Core.ConfigProvider,
};

// A default widens its literal.
let port = strapi.config.get('server.port', 1337);
port = 8080;
let host = strapi.config.get('server.host', 'localhost');
host = '0.0.0.0';
let enabled = strapi.config.get('plugin::parity.enabled', false);
enabled = true;
const flags = { debug: strapi.config.get('plugin::parity.debug', false) };
flags.debug = true;
const list = strapi.config.get('plugin::parity.list', [] as string[]);
list.push('x');
const items = strapi.config.get('plugin::parity.items', []);
items.push(1 as never);
[port, host, enabled] satisfies [number, string, boolean];

// Without default, `unknown`; `T` and annotations win.
const raw = strapi.config.get('server.port');
// @ts-expect-error TS18046 `unknown`
raw.toFixed();
const typed = strapi.config.get<number>('server.port');
typed.toFixed();
const annotated: number = strapi.config.get('server.port');
// @ts-expect-error TS2345 the default must match `T`
strapi.config.get<number>('server.port', 'x');

// Array, dynamic and numeric paths.
const byArray = strapi.config.get(['server', 'port'], 0);
const key: string = 'server.port';
const dynamic = strapi.config.get(key, 0);
const byNumber = strapi.config.get(0);

// `set`, `has` and the index signature.
strapi.config.set('server.port', 1);
const has: boolean = strapi.config.has('server.port');
const indexed = strapi.config.anything;

// `ReturnType` / `Parameters` of `get`: the same signature as the module and plugin `config`.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type ConfigGetParams = Parameters<Core.ConfigProvider['get']>;
declare const checks: [
  Expect<Equal<Core.ConfigProvider['get'], Core.Module['config']>>,
  Expect<Equal<ConfigGetParams, Parameters<Core.Plugin['config']>>>,
  Expect<Equal<ReturnType<Core.ConfigProvider['get']>, unknown>>,
];
const getConfig = (...args: ConfigGetParams) => strapi.config.get(...args);

export { configMock, partial, list, items, typed, annotated };
export { byArray, dynamic, byNumber, has, indexed, checks, getConfig };
