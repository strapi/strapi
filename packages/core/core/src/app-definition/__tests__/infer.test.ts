import type { Public, Schema } from '@strapi/types';

import { defineApp } from '../define-app';
import { fromDisk } from '../sources';
import * as is from '../attributes';
import type {
  ContentTypeUID,
  ContentTypeUIDs,
  RegisterContentTypes,
  RegisterComponents,
  ComponentUIDs,
  InferContentTypeSchema,
} from '../infer';

/**
 * Compile-time assertions. These have no runtime effect — they are verified by
 * `yarn test:ts` (and the package build). The single runtime `it` below keeps
 * Jest happy and documents intent. A mismatch is a *type* error here.
 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;

const app = defineApp({
  contentTypes: [
    {
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      attributes: { title: is.string({ required: true }), views: is.integer() },
    },
    {
      // explicit apiName groups this CT under a different API namespace.
      apiName: 'blog',
      singularName: 'author',
      pluralName: 'authors',
      displayName: 'Author',
      attributes: { name: is.string() },
    },
  ],
  components: [
    {
      uid: 'default.dish',
      displayName: 'Dish',
      attributes: { name: is.string(), price: is.decimal() },
    },
  ],
});

type App = typeof app;

// Single content type → structural uid (apiName defaults to singularName).
type ArticleCT = {
  singularName: 'article';
  pluralName: 'articles';
  displayName: 'Article';
  attributes: { title: Schema.Attribute.String };
};

// Explicit apiName is honoured.
type AuthorCT = {
  apiName: 'blog';
  singularName: 'author';
  pluralName: 'authors';
  displayName: 'Author';
  attributes: Record<string, never>;
};

type Registry = RegisterContentTypes<App>;
type ComponentRegistry = RegisterComponents<App>;

// A `fromDisk(...)` source yields no in-code inference (discovered/generated the
// file-based way instead).
const diskApp = defineApp({ contentTypes: fromDisk('./src/api') });

/**
 * Each entry must resolve to `true`; a mismatch is a compile error here (and
 * surfaces via `yarn test:ts`). Aggregated into one tuple so the assertions are
 * referenced (and the runtime `it` can assert on it).
 */
type Assertions = [
  // Structural uid, apiName defaulting + override.
  Expect<Equal<ContentTypeUID<ArticleCT>, 'api::article.article'>>,
  Expect<Equal<ContentTypeUID<AuthorCT>, 'api::blog.author'>>,
  // The app's content types are discovered and mapped to uids.
  Expect<Equal<ContentTypeUIDs<App>, 'api::article.article' | 'api::blog.author'>>,
  // The derived registry is keyed by uid.
  Expect<Equal<keyof Registry, 'api::article.article' | 'api::blog.author'>>,
  // Names + attribute value types survive end-to-end.
  Expect<Equal<Registry['api::article.article']['info']['singularName'], 'article'>>,
  Expect<Equal<Registry['api::article.article']['info']['pluralName'], 'articles'>>,
  Expect<Equal<Registry['api::article.article']['attributes']['title'], Schema.Attribute.String>>,
  Expect<Equal<Registry['api::article.article']['attributes']['views'], Schema.Attribute.Integer>>,
  Expect<Equal<Registry['api::article.article']['kind'], 'collectionType'>>,
  // Soundness: the derived registry is assignable to the public content-type
  // registry, so merging it via `declare module '@strapi/strapi'` type-checks —
  // which is exactly what makes `strapi.documents(uid)` UID-constrained and
  // attribute-aware.
  Expect<Extends<InferContentTypeSchema<ArticleCT>, Schema.ContentType<'api::article.article'>>>,
  Expect<Extends<Registry, Public.ContentTypeSchemas>>,
  // Components are inferred the same way.
  Expect<Equal<ComponentUIDs<App>, 'default.dish'>>,
  Expect<Equal<keyof ComponentRegistry, 'default.dish'>>,
  Expect<Extends<ComponentRegistry, Public.ComponentSchemas>>,
  // A `fromDisk(...)` source yields no in-code inference.
  Expect<Equal<keyof RegisterContentTypes<typeof diskApp>, never>>,
];

describe('end-to-end type inference', () => {
  it('preserves the definition literals at runtime (types asserted at compile time)', () => {
    const assertions: Assertions = [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ];

    expect(assertions).toHaveLength(15);
    expect(app.contentTypes?.[0]?.singularName).toBe('article');
    expect(app.components?.[0]?.uid).toBe('default.dish');
  });
});
