import type { Internal } from '@strapi/database';

import type * as Schema from '../schema';
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

/**
 * The document params only accept mutable arrays, while `const` type params infer readonly tuples.
 */
type Mutable<TValue> = TValue extends readonly (infer TItem)[] ? TItem[] : TValue;

type ExtractSelect<TParams> = TParams extends { select: infer TSelect } ? Mutable<TSelect> : never;

type ExtractPopulate<TSchemaUID extends UID.Schema, TParams> = TParams extends {
  populate: infer TPopulate;
}
  ? TPopulate extends true
    ? DocumentParams.Populate.WildcardNotation
    : TPopulate extends readonly string[]
      ? Mutable<TPopulate>
      : TPopulate extends Params.PopulateObjectNotation<TSchemaUID>
        ? Extract<
            {
              [TAttributeName in keyof TPopulate]-?: TPopulate[TAttributeName] extends false
                ? never
                : TAttributeName;
            }[keyof TPopulate],
            string
          >
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

type SelectedNames<TParams> = TParams extends { select: infer TSelect }
  ? TSelect extends readonly (infer TName)[]
    ? TName
    : TSelect
  : never;

type IdentityName = 'id' | 'documentId';

/**
 * `id` and `documentId` aren't schema attributes, so a `select` naming only them leaves
 * {@link DocumentResult} without fields, which it reads as every field.
 *
 * Keeps `id`, the selected identity names and the populated attributes instead.
 */
type NarrowIdentitySelect<TSchemaUID extends UID.Schema, TParams, TResult> = [
  SelectedNames<TParams>,
] extends [never]
  ? TResult
  : [Exclude<SelectedNames<TParams>, IdentityName>] extends [never]
    ? Omit<
        TResult,
        Exclude<
          Schema.NonPopulatableAttributeNames<TSchemaUID> | IdentityName,
          SelectedNames<TParams> | 'id'
        >
      >
    : TResult;

/**
 * A database entry for the given schema, shaped by the `select` and `populate` params.
 */
export type Entry<TSchemaUID extends UID.Schema, TParams = never> = If<
  Constants.AreSchemaRegistriesExtended,
  NarrowIdentitySelect<
    TSchemaUID,
    TParams,
    DocumentResult<TSchemaUID, ToDocumentParams<TSchemaUID, TParams>>
  >,
  AnyEntry
>;

export type PaginatedResult<TSchemaUID extends UID.Schema, TParams = never> = {
  results: Entry<TSchemaUID, TParams>[];
  pagination: Pagination;
};

export type CreateManyResult = CountResult & { ids: ID[] };

type LoadedEntry<TSchemaUID extends UID.Schema, TAttributeName extends string> = Entry<
  TSchemaUID,
  { select: 'id'; populate: TAttributeName[] }
>;

/**
 * Value of the loaded attribute for a single field, or an object with the loaded attributes for a list of fields.
 *
 * Resolves to `null` when the entry doesn't exist.
 */
export type Load<TSchemaUID extends UID.Schema, TField extends Params.LoadField<TSchemaUID>> = If<
  Constants.AreSchemaRegistriesExtended,
  | (Params.LoadedAttribute<TField> extends infer TAttributeName extends string
      ? TField extends readonly unknown[]
        ? Pick<
            LoadedEntry<TSchemaUID, TAttributeName>,
            Extract<TAttributeName, keyof LoadedEntry<TSchemaUID, TAttributeName>>
          >
        : LoadedEntry<TSchemaUID, TAttributeName>[Extract<
            TAttributeName,
            keyof LoadedEntry<TSchemaUID, TAttributeName>
          >]
      : never)
  | null,
  any
>;
