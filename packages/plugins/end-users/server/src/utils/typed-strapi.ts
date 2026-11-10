import type { Core, UID } from '@strapi/types';

/**
 * Typed doors to the parts of `strapi` that take a content type uid. Core types a uid as the
 * registry of the project's own types, which the plugin cannot know at build time, so the one cast
 * lives here and the caller says in a type argument what it relies on.
 */

/** `strapi.documents(uid)`, as the narrow interface the caller needs. */
export const documentsOf = <T>(strapi: Core.Strapi, uid: UID.ContentType): T =>
  strapi.documents(uid) as unknown as T;

/** `strapi.service(uid)`, as the narrow interface the caller needs. */
export const serviceOf = <T>(strapi: Core.Strapi, uid: UID.ContentType): T =>
  strapi.service(uid as UID.Service) as unknown as T;

/** `strapi.controller(uid)`, as the narrow interface the caller needs. */
export const controllerOf = <T>(strapi: Core.Strapi, uid: UID.ContentType): T =>
  strapi.controller(uid as UID.Controller) as unknown as T;

/** `strapi.db.query(uid)` for a model that may be a table of the engine, not a content type. */
export const queryOf = <T>(strapi: Core.Strapi, uid: string): T =>
  strapi.db.query(uid as UID.Schema) as unknown as T;

/** `strapi.contentTypes`, read by uid, as the shape the caller looks at. */
export const contentTypesOf = <T = Record<string, { attributes?: Record<string, unknown> }>>(
  strapi: Core.Strapi
): T => strapi.contentTypes as unknown as T;

/** `strapi.db.metadata.get(uid)`, as the shape of the model the caller looks at. */
export const metadataOf = <T>(db: Core.Strapi['db'], uid: string): T =>
  db.metadata.get(uid) as unknown as T;

type Params = Record<string, unknown>;

/** The Document Service calls the plugin makes on its own types, with the params as plain objects. */
export interface PluginDocuments {
  findOne(params: Params): Promise<Params | null>;
  findFirst(params: Params): Promise<Params | null>;
  findMany(params: Params): Promise<Params[]>;
  create(params: Params): Promise<Params>;
  update(params: Params): Promise<Params | null>;
  count(params: Params): Promise<number>;
}
