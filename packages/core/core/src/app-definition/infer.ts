import type { Struct } from '@strapi/types';

import type { AppComponent, AppContentType } from './types';
import type { DiskSource } from './sources';

/**
 * End-to-end type inference: derive the `@strapi/types` public schema registries
 * (the same ones file-based apps populate from a generated `contentTypes.d.ts`)
 * from a `defineApp(...)` definition, so `strapi.documents(...)` becomes fully
 * UID-constrained and attribute-aware (Phase 3).
 *
 * Unlike file-based apps there is nothing to generate: `defineApp` preserves the
 * definition's literal types on its return value, so {@link RegisterContentTypes}
 * /{@link RegisterComponents} can map `typeof app` straight into the global
 * registry via one explicit `declare module` block — no codegen, no magic:
 *
 * @example
 * ```ts
 * import { defineApp } from '@strapi/strapi';
 * import * as is from '@strapi/strapi/attributes';
 * import type { RegisterContentTypes } from '@strapi/strapi';
 *
 * const app = defineApp({
 *   contentTypes: [
 *     {
 *       singularName: 'article',
 *       pluralName: 'articles',
 *       displayName: 'Article',
 *       attributes: { title: is.string(), views: is.integer() },
 *     },
 *   ],
 * });
 *
 * declare module '@strapi/strapi' {
 *   export module Public {
 *     // `strapi.documents('api::article.article')` is now fully typed.
 *     export interface ContentTypeSchemas extends RegisterContentTypes<typeof app> {}
 *   }
 * }
 * ```
 */

/**
 * Extract the in-code content types from an app definition (or its input). A
 * `fromDisk(...)` source is not an array, so it yields `never` (a disk app's
 * types are discovered/generated the file-based way instead).
 */
export type InCodeContentTypes<TApp> = TApp extends { contentTypes: infer TContentTypes }
  ? Exclude<TContentTypes, DiskSource> extends readonly (infer TContentType)[]
    ? TContentType extends AppContentType
      ? TContentType
      : never
    : never
  : never;

/**
 * The API namespace a content type lives under: its explicit `apiName`, or its
 * `singularName` when omitted (ADR-0011, decision 20).
 */
export type ContentTypeApiName<TContentType extends AppContentType> = TContentType extends {
  apiName: infer TApiName extends string;
}
  ? TApiName
  : TContentType['singularName'];

/**
 * The structural `api::<apiName>.<singularName>` uid built for a programmatic
 * content type — matching what the normalizer assembles at runtime.
 */
export type ContentTypeUID<TContentType extends AppContentType> =
  `api::${ContentTypeApiName<TContentType>}.${TContentType['singularName']}`;

/**
 * Apply {@link ContentTypeUID} to each member of a content-type union. The naked
 * type parameter makes the conditional distributive — applying
 * {@link ContentTypeUID} to the union directly would cross-multiply `apiName` ×
 * `singularName` inside the template literal.
 */
type ContentTypeUIDPerMember<TContentType> = TContentType extends AppContentType
  ? ContentTypeUID<TContentType>
  : never;

/** Union of every in-code content type's uid declared by an app. */
export type ContentTypeUIDs<TApp> = ContentTypeUIDPerMember<InCodeContentTypes<TApp>>;

type ContentTypeKind<TContentType extends AppContentType> = TContentType extends {
  kind: infer TKind extends Struct.ContentTypeKind;
}
  ? TKind
  : 'collectionType';

type SchemaOptionsOf<TContentType extends AppContentType> = TContentType extends {
  options: infer TOptions extends Struct.SchemaOptions;
}
  ? TOptions
  : object;

/**
 * Build the {@link Struct.ContentTypeSchema} for a single programmatic content
 * type — the shape `@strapi/types` expects in the public registry, derived from
 * the definition's names + attributes.
 */
export type InferContentTypeSchema<TContentType extends AppContentType> = {
  uid: ContentTypeUID<TContentType>;
  modelType: 'contentType';
  modelName: TContentType['singularName'];
  globalId: string;
  kind: ContentTypeKind<TContentType>;
  info: {
    singularName: TContentType['singularName'];
    pluralName: TContentType['pluralName'];
    displayName: TContentType['displayName'];
  };
  options: SchemaOptionsOf<TContentType>;
  attributes: TContentType['attributes'];
};

/**
 * Map an app definition's in-code content types into a
 * `Public.ContentTypeSchemas`-shaped registry, keyed by uid. Merge it into the
 * global registry with a `declare module '@strapi/strapi'` block (see the
 * file-level example) to get full `strapi.documents(...)` typing.
 */
export type RegisterContentTypes<TApp> = {
  [TContentType in InCodeContentTypes<TApp> as ContentTypeUID<TContentType>]: InferContentTypeSchema<TContentType>;
};

/**
 * Extract the in-code components from an app definition (or its input). A
 * `fromDisk(...)` source yields `never`.
 */
export type InCodeComponents<TApp> = TApp extends { components: infer TComponents }
  ? Exclude<TComponents, DiskSource> extends readonly (infer TComponent)[]
    ? TComponent extends AppComponent
      ? TComponent
      : never
    : never
  : never;

/** A programmatic component's uid (`<category>.<name>`). */
export type ComponentUID<TComponent extends AppComponent> = TComponent['uid'];

/** Union of every in-code component's uid declared by an app. */
export type ComponentUIDs<TApp> = ComponentUID<InCodeComponents<TApp>>;

/**
 * Build the {@link Struct.ComponentSchema} for a single programmatic component —
 * the shape `@strapi/types` expects in the public registry.
 */
export type InferComponentSchema<TComponent extends AppComponent> = {
  uid: TComponent['uid'];
  modelType: 'component';
  modelName: string;
  globalId: string;
  category: string;
  info: {
    displayName: TComponent['displayName'];
  };
  attributes: TComponent['attributes'];
};

/**
 * Map an app definition's in-code components into a
 * `Public.ComponentSchemas`-shaped registry, keyed by uid. Merge it into the
 * global registry the same way as {@link RegisterContentTypes} so component
 * attributes (and `is.component({ component })` references) type-check.
 */
export type RegisterComponents<TApp> = {
  [TComponent in InCodeComponents<TApp> as ComponentUID<TComponent>]: InferComponentSchema<TComponent>;
};
