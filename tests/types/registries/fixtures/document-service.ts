// Document Service types on registered schemas. Its own program: the entries narrow every lookup.
// Known gaps are `@ts-expect-error` cases with a comment: fixing one makes its directive unused.
import type { Core, Data, Schema, Struct } from '@strapi/strapi';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  options: { draftAndPublish: true };
  pluginOptions: { i18n: { localized: true } };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    views: Schema.Attribute.Integer;
    category: Schema.Attribute.Relation<'manyToOne', 'api::category.category'>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
  };
}

interface CategorySchema extends Struct.CollectionTypeSchema {
  collectionName: 'categories';
  info: { singularName: 'category'; pluralName: 'categories'; displayName: 'Category' };
  attributes: { name: Schema.Attribute.String };
}

interface SeoSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: { displayName: 'Seo' };
  attributes: { metaTitle: Schema.Attribute.String };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface ContentTypeSchemas {
        'api::article.article': ArticleSchema;
        'api::category.category': CategorySchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
      }
    }
  }
}

declare const app: Core.Strapi;
const articles = app.documents('api::article.article');

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type HasKey<T, TKey extends string> = TKey extends keyof T ? true : false;
type Result<T> = Awaited<T> extends (infer TItem)[] ? TItem : Awaited<T>;

const all = articles.findMany();
const selected = articles.findMany({ fields: ['title'] });
const populated = articles.findMany({ populate: ['category'] });
const nested = articles.findMany({
  fields: ['title'],
  populate: { category: { fields: ['name'] } },
});
const component = articles.findMany({ populate: { seo: true } });
const one = articles.findOne({ documentId: 'a', status: 'published', locale: 'fr' });
const filtered = articles.findMany({
  filters: { title: { $eq: 'x' }, views: { $gt: 1 }, category: { name: { $contains: 'y' } } },
});

type Article = Result<typeof all>;
type Category = { id: Data.ID; documentId: string; name?: string | null };

declare const checks: [
  // Scalar attributes, without relations and components unless populated.
  Expect<Equal<keyof Article, 'id' | 'documentId' | 'title' | 'views'>>,
  Expect<Equal<Article['views'], number | null | undefined>>,
  // `fields` narrows the result.
  Expect<Equal<keyof Result<typeof selected>, 'id' | 'documentId' | 'title'>>,
  // `populate` adds the relation, typed from its target.
  Expect<Equal<Result<typeof populated>['category'], Category | null | undefined>>,
  Expect<Equal<keyof Result<typeof nested>, 'id' | 'documentId' | 'title' | 'category'>>,
  Expect<Equal<keyof Result<typeof component>, 'id' | 'documentId' | 'title' | 'views' | 'seo'>>,
  Expect<Equal<Awaited<typeof one>, Article | null>>,
  Expect<Equal<Result<typeof filtered>, Article>>,
];
checks satisfies unknown;

// @ts-expect-error `fields` lists attributes of the schema.
void articles.findMany({ fields: ['missing'] });
// @ts-expect-error `filters` lists attributes of the schema.
void articles.findMany({ filters: { missing: { $eq: 1 } } });
// @ts-expect-error `populate` lists populatable attributes of the schema.
void articles.findMany({ populate: ['missing'] });
// @ts-expect-error `status` is `draft` or `published`.
void articles.findMany({ status: 'archived' });
// @ts-expect-error Create requires required attributes.
void articles.create({ data: { views: 1 } });
void articles.create({ data: { title: 'Title', views: 1 } });

// `update` takes `status`, as at runtime: `published` publishes the updated draft.
void articles.update({ documentId: 'a', data: { views: 1 }, status: 'published' });
void articles.update({ documentId: 'a', data: { views: 1 }, status: 'draft' });
// @ts-expect-error `status` is `draft` or `published`.
void articles.update({ documentId: 'a', status: 'archived' });

// Known gap (Required): a required attribute stays optional and nullable in results.
// @ts-expect-error
export type RequiredTitle = Expect<Equal<Article['title'], string>>;
// Known gap (locale): results of a localized content type do not type `locale`.
// @ts-expect-error
export type LocalizedResult = Expect<HasKey<Article, 'locale'>>;
// Known gap (status): results of a draft and publish content type do not type `publishedAt`.
// @ts-expect-error
export type PublishedResult = Expect<HasKey<Article, 'publishedAt'>>;
// Known gap (filters): filter values are not checked against the attribute type. This compiles,
// so it is not an `@ts-expect-error` case.
void articles.findMany({ filters: { views: { $eq: 'not a number' } } });

// `use()` returns the function that removes the middleware, as at runtime.
const removeMiddleware = app.documents.use(async (_context, next) => next());
removeMiddleware satisfies () => void;
// @ts-expect-error `use()` does not return the service, so calls cannot be chained.
app.documents.use(async (_context, next) => next()).use(async (_context, next) => next());
