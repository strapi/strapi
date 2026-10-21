// Module augmentation. Keep it in the entry point so that every consumer of
// `@strapi/types` — workspaces and published packages alike — picks up the
// `koa` request augmentations (`ctx.request.body`, `ctx.request.files`).
// A type reference (not a side-effect import) so no runtime require of koa-body is emitted
//
// Known cost: admin (browser) programs that import `@strapi/types` also load koa-body and its
// server-only typings (formidable, co-body). The `Core` namespace already pulls koa, knex and
// friends into those programs, so moving this reference alone would not make the entry point
// browser-safe. That needs a host-agnostic subpath export first.
/// <reference types="koa-body" preserve="true" />

export type * as Core from './core';
export type * as Data from './data';
export type * as Internal from './internal';
export type * as Modules from './modules';
export type * as Plugin from './plugin';
export type * as Public from './public';
export type * as Schema from './schema';
export type * as Utils from './utils';
export type * as Struct from './struct';
export type * as UID from './uid';
