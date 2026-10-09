// Strict mode with generated schemas. Its own program: the entries narrow every schema lookup.
import type { Schema, Struct, UID } from '@strapi/strapi';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  attributes: { title: Schema.Attribute.String };
}

interface HomepageSchema extends Struct.SingleTypeSchema {
  collectionName: 'homepages';
  attributes: { headline: Schema.Attribute.String };
}

interface SeoSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  attributes: { metaTitle: Schema.Attribute.String };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface ContentTypeSchemas {
        'api::article.article': ArticleSchema;
        'api::homepage.homepage': HomepageSchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
      }
    }
  }
}

// Strict mode ignores Public entries, even next to generated global entries.
declare module '@strapi/strapi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Public {
    interface ContentTypeSchemas {
      'api::legacy.legacy': Struct.CollectionTypeSchema;
    }
    interface ComponentSchemas {
      'legacy.legacy': Struct.ComponentSchema;
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const checks: [
  Expect<Equal<UID.ContentType, 'api::article.article' | 'api::homepage.homepage'>>,
  Expect<Equal<UID.Component, 'shared.seo'>>,
  Expect<Equal<UID.Schema, 'api::article.article' | 'api::homepage.homepage' | 'shared.seo'>>,
  Expect<Equal<UID.CollectionType, 'api::article.article'>>,
  Expect<Equal<UID.SingleType, 'api::homepage.homepage'>>,
  Expect<Equal<UID.ComponentCategory, 'shared'>>,
  Expect<Equal<UID.IsCollectionType<'api::article.article'>, true>>,
  Expect<Equal<UID.IsCollectionType<'api::homepage.homepage'>, false>>,
  Expect<Equal<UID.IsSingleType<'api::homepage.homepage'>, true>>,
  Expect<Equal<UID.IsSingleType<'api::article.article'>, false>>,
  Expect<Equal<UID.IsComponent<'shared.seo'>, true>>,
  Expect<Equal<UID.IsContentType<'api::article.article'>, true>>,
  Expect<Equal<Schema.ContentType<'api::article.article'>, ArticleSchema>>,
  Expect<Equal<Schema.Component<'shared.seo'>, SeoSchema>>,
  Expect<Equal<Schema.Schema<'api::homepage.homepage'>, HomepageSchema>>,
  Expect<Equal<Schema.AttributeNames<'api::article.article'>, 'title'>>,
];
checks satisfies unknown;

// @ts-expect-error Generated schemas close content-type UIDs.
const missingContentType: UID.ContentType = 'api::missing.missing';
// @ts-expect-error Public entries are not content-type UIDs in strict mode.
const legacyContentType: UID.ContentType = 'api::legacy.legacy';
// @ts-expect-error Generated schemas close component UIDs.
const missingComponent: UID.Component = 'missing.missing';
// @ts-expect-error Public entries are not component UIDs in strict mode.
const legacyComponent: UID.Component = 'legacy.legacy';
[missingContentType, legacyContentType, missingComponent, legacyComponent] satisfies unknown;
