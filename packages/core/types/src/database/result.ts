import type { Internal } from '@strapi/database';

import type * as UID from '../uid';
import type { Constants, If } from '../utils';
import type { ID } from '../data';
import type { Params as DocumentParams, Result as DocumentResult } from '../modules/documents';
import type * as Params from './params';

export type CountResult = Internal.CountResult;

export type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

/**
 * Loose representation of a database entry, used when the schema registries are not extended.
 *
 * TODO: Narrow to `{ id: ID } & { [key: string]: unknown }` once the callers are typed.
 */
export type AnyEntry = any;

/**
 * Minimal reference to an existing entry.
 */
export type EntryReference = { id: ID };

type ExtractSelect<TParams> = TParams extends { select: infer TSelect } ? TSelect : never;

type ExtractPopulate<TSchemaUID extends UID.Schema, TParams> = TParams extends {
  populate: infer TPopulate;
}
  ? TPopulate extends true
    ? DocumentParams.Populate.WildcardNotation
    : TPopulate extends readonly string[]
      ? TPopulate
      : TPopulate extends Params.PopulateObjectNotation<TSchemaUID>
        ? // TODO: Handle attributes set to false in object notation
          Extract<keyof TPopulate, string>
        : never
  : never;

/**
 * Translates database params (`select`, `populate`) to the document params (`fields`, `populate`)
 * expected by {@link DocumentResult}.
 */
type ToDocumentParams<TSchemaUID extends UID.Schema, TParams> = {
  fields: ExtractSelect<TParams>;
  populate: ExtractPopulate<TSchemaUID, TParams>;
} extends infer TDocumentParams extends DocumentParams.Pick<TSchemaUID, 'fields' | 'populate'>
  ? TDocumentParams
  : never;

/**
 * A database entry for the given schema, shaped by the `select` and `populate` params.
 */
export type Entry<TSchemaUID extends UID.Schema, TParams = never> = If<
  Constants.AreSchemaRegistriesExtended,
  DocumentResult<TSchemaUID, ToDocumentParams<TSchemaUID, TParams>>,
  AnyEntry
>;

export type PaginatedResult<TSchemaUID extends UID.Schema, TParams = never> = {
  results: Entry<TSchemaUID, TParams>[];
  pagination: Pagination;
};

export type CreateManyResult = CountResult & { ids: ID[] };

/**
 * Value of the loaded attribute(s) for the given entry.
 */
export type Load<
  TSchemaUID extends UID.Schema,
  TAttributeName extends Params.PopulatableAttribute<TSchemaUID>,
> = If<
  Constants.AreSchemaRegistriesExtended,
  Entry<TSchemaUID, { select: 'id'; populate: [TAttributeName] }>[Extract<
    TAttributeName,
    keyof Entry<TSchemaUID, { select: 'id'; populate: [TAttributeName] }>
  >],
  any
>;
