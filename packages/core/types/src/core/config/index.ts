import type * as Shared from './shared';
import type { Server } from './server';
import type { Admin } from './admin';
import type { Api } from './api';
import type { Plugin } from './plugin';
import type { Database, ClientKind } from './database';
import type { Middlewares } from './middlewares';

export type ServerConfigExport = Shared.ConfigExport<Server>;
export type AdminConfigExport = Shared.ConfigExport<Admin>;
export type ApiConfigExport = Shared.ConfigExport<Api>;
export type PluginConfigExport = Shared.ConfigExport<Plugin>;
export type DatabaseConfigExport<TClient extends ClientKind = ClientKind> = Shared.ConfigExport<
  Database<TClient>
>;
export type MiddlewaresConfigExport = Shared.ConfigExport<Middlewares>;

export type * as Shared from './shared';
export type { Server } from './server';
export type { Admin } from './admin';
export type { Api } from './api';
export type { Plugin } from './plugin';
export type { Database } from './database';
export type { Middlewares } from './middlewares';
