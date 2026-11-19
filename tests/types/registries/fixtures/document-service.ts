// Document Service types on registered schemas. Its own program: the entries narrow every lookup.
// Known gaps are `@ts-expect-error` cases with a comment: fixing one makes its directive unused.
// eslint-disable-next-line import/no-extraneous-dependencies
import { factories, type Core, type Data, type Schema, type Struct } from '@strapi/strapi';

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

// Generated-style schemas: type generation adds `createdAt`, `updatedAt`, `publishedAt` and `locale`.
interface PageSchema extends Struct.CollectionTypeSchema {
  collectionName: 'pages';
  info: { singularName: 'page'; pluralName: 'pages'; displayName: 'Page' };
  options: { draftAndPublish: true };
  pluginOptions: { i18n: { localized: true } };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    secret: Schema.Attribute.String & Schema.Attribute.Private;
    day: Schema.Attribute.Date;
    at: Schema.Attribute.Time;
    stamp: Schema.Attribute.Timestamp;
    tags: Schema.Attribute.Relation<'oneToMany', 'api::category.category'>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    blocks: Schema.Attribute.Component<'shared.seo', true>;
    createdAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
  };
}

interface NoteSchema extends Struct.CollectionTypeSchema {
  collectionName: 'notes';
  info: { singularName: 'note'; pluralName: 'notes'; displayName: 'Note' };
  options: { draftAndPublish: false };
  attributes: {
    title: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
  };
}

interface HomepageSchema extends Struct.SingleTypeSchema {
  collectionName: 'homepages';
  info: { singularName: 'homepage'; pluralName: 'homepages'; displayName: 'Homepage' };
  options: { draftAndPublish: true };
  pluginOptions: { i18n: { localized: true } };
  attributes: {
    title: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
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
      interface AppContentTypeSchemas {
        'api::article.article': ArticleSchema;
        'api::category.category': CategorySchema;
        'api::page.page': PageSchema;
        'api::note.note': NoteSchema;
        'api::homepage.homepage': HomepageSchema;
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
  // Scalar attributes, without relations and components unless populated. A selected key is present.
  Expect<Equal<keyof Article, 'id' | 'documentId' | 'title' | 'views'>>,
  Expect<Equal<Article['views'], number | null>>,
  Expect<
    Equal<Partial<Pick<Article, 'views'>> extends Pick<Article, 'views'> ? true : false, false>
  >,
  // `Required` attributes stay nullable: drafts, later schema changes and raw writes leave them empty.
  Expect<Equal<Article['title'], string | null>>,
  // `fields` narrows the result.
  Expect<Equal<keyof Result<typeof selected>, 'id' | 'documentId' | 'title'>>,
  // `populate` adds the relation, typed from its target, `null` when there is none.
  Expect<Equal<Result<typeof populated>['category'], Category | null>>,
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
// A draft may miss required attributes; a published entry may not (see `document-write.ts`).
void articles.create({ data: { views: 1 } });
// @ts-expect-error Publishing requires required attributes.
void articles.create({ data: { views: 1 }, status: 'published' });
void articles.create({ data: { title: 'Title', views: 1 }, status: 'published' });

// `update` takes `status`, as at runtime: `published` publishes the updated draft.
void articles.update({ documentId: 'a', data: { views: 1 }, status: 'published' });
void articles.update({ documentId: 'a', data: { views: 1 }, status: 'draft' });
// @ts-expect-error `status` is `draft` or `published`.
void articles.update({ documentId: 'a', status: 'archived' });

// `clone` never resolves to `null`; without a source entry, `documentId` is `undefined`.
const cloned = articles.clone({ documentId: 'a' });
declare const cloneChecks: [
  Expect<Equal<Awaited<typeof cloned>['documentId'], Data.DocumentID | undefined>>,
  Expect<Equal<null extends Awaited<typeof cloned> ? true : false, false>>,
];
cloneChecks satisfies unknown;

// The Document Service builds `lookup` itself and every method rejects one from the caller.
// @ts-expect-error `lookup` is internal.
void articles.findMany({ lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.findFirst({ lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.findOne({ documentId: 'a', lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.count({ lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.create({ data: { title: 'Title' }, lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.update({ documentId: 'a', lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.clone({ documentId: 'a', lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.delete({ documentId: 'a', lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.publish({ documentId: 'a', lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.unpublish({ documentId: 'a', lookup: { locale: 'fr' } });
// @ts-expect-error `lookup` is internal.
void articles.discardDraft({ documentId: 'a', lookup: { locale: 'fr' } });

// The result model on generated-style schemas.
const pages = app.documents('api::page.page');
const notes = app.documents('api::note.note');
declare const anyStatus: 'draft' | 'published';
const draftPage = pages.findOne({ documentId: 'a' });
const publishedPage = pages.findOne({ documentId: 'a', status: 'published' });
const eitherPage = pages.findFirst({ status: anyStatus });
const populatedPage = pages.findMany({ populate: ['tags', 'seo', 'blocks'] });
const createdDraft = pages.create({ data: { title: 'Title', day: new Date() } });
const createdPublished = pages.create({ data: { title: 'Title' }, status: 'published' });
const published = pages.publish({ documentId: 'a' });
const discarded = pages.discardDraft({ documentId: 'a' });
const deleted = pages.delete({ documentId: 'a' });
const note = notes.findOne({ documentId: 'a' });
type Page = NonNullable<Awaited<typeof draftPage>>;
type Entries<T> = Awaited<T> extends { entries: (infer TEntry)[] } ? TEntry : never;
declare const modelChecks: [
  // Every selected scalar is present, private ones included; unpopulated attributes are absent.
  Expect<
    Equal<
      keyof Page,
      | 'id'
      | 'documentId'
      | 'title'
      | 'secret'
      | 'day'
      | 'at'
      | 'stamp'
      | 'createdAt'
      | 'updatedAt'
      | 'publishedAt'
      | 'locale'
    >
  >,
  // `publishedAt` follows draft and publish and the status: reads default to drafts.
  Expect<Equal<Page['publishedAt'], null>>,
  Expect<Equal<NonNullable<Awaited<typeof publishedPage>>['publishedAt'], string>>,
  Expect<Equal<NonNullable<Awaited<typeof eitherPage>>['publishedAt'], string | null>>,
  Expect<Equal<Result<typeof createdDraft>['publishedAt'], null>>,
  Expect<Equal<Result<typeof createdPublished>['publishedAt'], string>>,
  Expect<Equal<Entries<typeof published>['publishedAt'], string>>,
  Expect<Equal<Entries<typeof discarded>['publishedAt'], null>>,
  Expect<Equal<Entries<typeof deleted>['publishedAt'], string | null>>,
  // Without draft and publish, every write sets `publishedAt`.
  Expect<Equal<NonNullable<Awaited<typeof note>>['publishedAt'], string>>,
  // A localized content type always has a locale; others may hold `null`.
  Expect<Equal<Page['locale'], string>>,
  Expect<Equal<NonNullable<Awaited<typeof note>>['locale'], string | null>>,
  // Dates are strings in results; timestamps are set by every write.
  Expect<Equal<Page['day'], string | null>>,
  Expect<Equal<Page['at'], string | null>>,
  Expect<Equal<Page['stamp'], string | null>>,
  Expect<Equal<Page['createdAt'], string>>,
  // To-many populates are arrays, never `null`; to-one populates may be `null`.
  Expect<Equal<null extends Result<typeof populatedPage>['tags'] ? true : false, false>>,
  Expect<Equal<null extends Result<typeof populatedPage>['blocks'] ? true : false, false>>,
  Expect<Equal<null extends Result<typeof populatedPage>['seo'] ? true : false, true>>,
];
modelChecks satisfies unknown;

// The core service reads published entries unless the params pass a status.
declare const pageService: Core.CoreAPI.Service.ContentType<'api::page.page'>;
const coreFound = pageService.find({});
const coreDraft = pageService.findOne('a', { status: 'draft' });
const coreSelected = pageService.findOne('a', { fields: ['title'] });
declare const coreChecks: [
  Expect<Equal<Awaited<typeof coreFound>['results'][number]['publishedAt'], string>>,
  Expect<Equal<NonNullable<Awaited<typeof coreDraft>>['publishedAt'], null>>,
  // The params are spread over the default: an explicit `undefined` reads drafts.
  Expect<
    Equal<Core.CoreAPI.Service.Entry<'api::page.page', { status: undefined }>['publishedAt'], null>
  >,
  Expect<Equal<keyof NonNullable<Awaited<typeof coreSelected>>, 'id' | 'documentId' | 'title'>>,
];
coreChecks satisfies unknown;

// The core service passes its other params to the Document Service as they are: `filters`, `sort`,
// `locale`, and for `find` the REST `pagination`. `fields`, `populate` and `status` still narrow.
declare const articleService: Core.CoreAPI.Service.ContentType<'api::article.article'>;
const coreQuery = articleService.find({
  fields: ['title'],
  populate: ['category'],
  filters: { title: { $eq: 'x' }, category: { name: { $contains: 'y' } } },
  sort: ['title:asc'],
  pagination: { page: 1, pageSize: 10, withCount: false },
  locale: 'fr',
});
const coreQueryOne = articleService.findOne('a', {
  fields: ['title'],
  populate: ['category'],
  filters: { views: { $gt: 1 } },
  sort: 'title:desc',
  locale: 'fr',
});
const coreQueryOnly = articleService.find({
  filters: { title: { $eq: 'x' } },
  sort: 'views:desc',
  pagination: { start: 0, limit: 5, withCount: true },
  locale: 'fr',
});
const coreQueryOnlyOne = articleService.findOne('a', { filters: { views: { $gt: 1 } } });
const findParams = {
  filters: { views: { $gt: 1 } },
  sort: { title: 'asc' },
  pagination: { start: 0, limit: 5 },
  locale: 'fr',
} as const;
const findOneParams = { filters: { views: { $gt: 1 } }, sort: 'views', locale: 'fr' } as const;
const coreFromVariable = articleService.find(findParams);
const coreOneFromVariable = articleService.findOne('a', findOneParams);
// A filter value from a variable, without `as const`.
declare const title: string;
void articleService.find({ filters: { title } });
const mutableParams = { filters: { title }, pagination: { page: 1, pageSize: 10 } };
void articleService.find(mutableParams);
const coreDraftQuery = pageService.find({
  status: 'draft',
  filters: { title: { $eq: 'x' } },
  pagination: { page: 2 },
  locale: 'fr',
});
type CoreQueryEntry = NonNullable<Awaited<typeof coreQueryOne>>;
declare const coreQueryChecks: [
  Expect<
    Equal<
      keyof Awaited<typeof coreQuery>['results'][number],
      'id' | 'documentId' | 'title' | 'category'
    >
  >,
  Expect<Equal<keyof CoreQueryEntry, 'id' | 'documentId' | 'title' | 'category'>>,
  Expect<Equal<CoreQueryEntry['category'], Category | null>>,
  Expect<Equal<Awaited<typeof coreQueryOnly>['results'][number], Article>>,
  Expect<Equal<Awaited<typeof coreQueryOnlyOne>, Article | null>>,
  Expect<Equal<Awaited<typeof coreFromVariable>['results'][number], Article>>,
  Expect<Equal<Awaited<typeof coreOneFromVariable>, Article | null>>,
  Expect<Equal<Awaited<typeof coreDraftQuery>['results'][number]['publishedAt'], null>>,
];
coreQueryChecks satisfies unknown;
// The single type's `find` reads with the Document Service's `findFirst`, which takes them too.
declare const homepageService: Core.CoreAPI.Service.ContentType<'api::homepage.homepage'>;
const homepage = homepageService.find({ locale: 'fr' });
const homepageQuery = homepageService.find({
  fields: ['title'],
  status: 'draft',
  filters: { title: { $eq: 'x' } },
  sort: 'title',
  locale: 'fr',
});
const homepageParams = { filters: { title: { $eq: 'x' } }, locale: 'fr' } as const;
const homepageFromVariable = homepageService.find(homepageParams);
type Homepage = NonNullable<Awaited<typeof homepage>>;
declare const singleTypeQueryChecks: [
  Expect<Equal<Homepage['publishedAt'], string>>,
  Expect<Equal<keyof NonNullable<Awaited<typeof homepageQuery>>, 'id' | 'documentId' | 'title'>>,
  Expect<Equal<NonNullable<Awaited<typeof homepageQuery>>['title'], string | null>>,
  Expect<Equal<NonNullable<Awaited<typeof homepageFromVariable>>, Homepage>>,
];
singleTypeQueryChecks satisfies unknown;

// The other params keep the Document Service checks. `fields` is passed so that each case fails on
// the checked key, not on a params object without any known key.
// @ts-expect-error `filters` lists attributes of the schema.
void articleService.find({ fields: ['title'], filters: { missing: { $eq: 1 } } });
// @ts-expect-error `sort` lists attributes of the schema.
void articleService.findOne('a', { fields: ['title'], sort: 'missing' });
// @ts-expect-error `pagination` takes one notation: pages or offsets.
void articleService.find({ fields: ['title'], pagination: { page: 1, limit: 5 } });
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.find({ fields: ['title'], lookup: { locale: 'fr' } });
// @ts-expect-error `findFirst` reads one entry: its `locale` is a single code.
void homepageService.find({ fields: ['title'], locale: ['fr', 'en'] });

// The core service writes pass their params to the Document Service's `create` and `update`, which
// take `data`, `fields`, `populate`, `locale` and `status`. They stay accepted, as literals and
// through variables.
const coreCreated = articleService.create({
  data: { title: 'Title' },
  fields: ['title'],
  populate: ['category'],
  locale: 'fr',
});
void articleService.create({ data: { views: 1 }, status: 'draft', locale: 'fr' });
const coreUpdated = articleService.update('a', {
  data: { views: 1 },
  fields: ['title'],
  populate: ['category'],
  status: 'draft',
  locale: 'fr',
});
const coreUpserted = homepageService.createOrUpdate({
  data: { title: 'Title' },
  fields: ['title'],
  locale: 'fr',
});
const createParams = { data: { title: 'Title' }, status: 'published', locale: 'fr' } as const;
const updateParams = { data: { views: 1 }, status: 'draft', locale: 'fr' } as const;
const upsertParams = { data: { title: 'Title' }, locale: 'fr' };
void articleService.create(createParams);
void articleService.update('a', updateParams);
void homepageService.createOrUpdate(upsertParams);
declare const coreWriteChecks: [
  Expect<Equal<keyof Awaited<typeof coreCreated>, 'id' | 'documentId' | 'title' | 'category'>>,
  Expect<
    Equal<
      keyof NonNullable<Awaited<typeof coreUpdated>>,
      'id' | 'documentId' | 'title' | 'category'
    >
  >,
  Expect<Equal<keyof NonNullable<Awaited<typeof coreUpserted>>, 'id' | 'documentId' | 'title'>>,
];
coreWriteChecks satisfies unknown;

// The core service writes reject `lookup` too: the Document Service's `create` and `update` throw
// on one from the caller.
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.create({ data: { title: 'Title' }, lookup: { locale: 'fr' } });
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.update('a', { data: { views: 1 }, lookup: { locale: 'fr' } });
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void homepageService.createOrUpdate({ data: { title: 'Title' }, lookup: { locale: 'fr' } });
const createWithLookup = { data: { title: 'Title' }, lookup: { locale: 'fr' } };
const updateWithLookup = { data: { views: 1 }, lookup: { locale: 'fr' } };
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.create(createWithLookup);
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.update('a', updateWithLookup);
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void homepageService.createOrUpdate(createWithLookup);

// The core service `delete` passes its params to the Document Service's `delete`, which takes
// `fields`, `populate`, `filters`, `status`, `publicationFilter`, `hasPublishedVersion` and `locale`.
// They stay accepted, as literals and through variables. The service sets `documentId` itself.
const coreDeleted = articleService.delete('a', { locale: 'fr', fields: ['title'] });
void articleService.delete('a', { populate: ['category'], filters: { views: { $gt: 1 } } });
void articleService.delete('a', {});
const coreSingleDeleted = homepageService.delete({ locale: 'fr' });
const deleteParams = { locale: 'fr', status: 'published' } as const;
void articleService.delete('a', deleteParams);
void homepageService.delete(deleteParams);
declare const coreDeleteChecks: [
  Expect<Equal<[Awaited<typeof coreDeleted>], [{ deletedEntries: number }]>>,
  Expect<Equal<[Awaited<typeof coreSingleDeleted>], [{ deletedEntries: number }]>>,
];
coreDeleteChecks satisfies unknown;

// The core service defaults the params of `find`, `findOne` and `delete` to `{}`
// (`core-api/service/collection-type.ts` and `single-type.ts` in `@strapi/core`): a call without
// params compiles, and reads as with `{}`.
const coreFoundWithoutParams = articleService.find();
const coreFoundOneWithoutParams = articleService.findOne('a');
const coreDeletedWithoutParams = articleService.delete('a');
const homepageWithoutParams = homepageService.find();
const homepageDeletedWithoutParams = homepageService.delete();
declare const coreWithoutParamsChecks: [
  Expect<Equal<[Awaited<typeof coreFoundWithoutParams>['results'][number]], [Article]>>,
  Expect<Equal<[Awaited<typeof coreFoundOneWithoutParams>], [Article | null]>>,
  Expect<Equal<[Awaited<typeof coreDeletedWithoutParams>], [{ deletedEntries: number }]>>,
  Expect<Equal<[Awaited<typeof homepageWithoutParams>], [Homepage | null]>>,
  Expect<Equal<[Awaited<typeof homepageDeletedWithoutParams>], [{ deletedEntries: number }]>>,
];
coreWithoutParamsChecks satisfies unknown;

// The core service `delete` rejects `lookup`: the Document Service's `delete` throws
// `ValidationError("Invalid params: 'lookup'")` on one from the caller. A literal with a key the
// Document Service's `delete` does not take is rejected too.
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.delete('a', { lookup: { locale: 'fr' } });
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void homepageService.delete({ lookup: { locale: 'fr' } });
const deleteWithLookup = { lookup: { locale: 'fr' } };
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void articleService.delete('a', deleteWithLookup);
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void homepageService.delete(deleteWithLookup);
// @ts-expect-error The params are those of the Document Service's `delete`.
void articleService.delete('a', { unknownParam: 1 });
// @ts-expect-error The params are those of the Document Service's `delete`.
void homepageService.delete({ unknownParam: 1 });

// A core service without config, as `strapi generate` writes it (`createCoreService(uid)`), is the
// core service of its content type: the factory adds no override, so the strict signatures apply
// alone. A factory with a config keeps the override types of `Core.CoreAPI.Service.Extendable`.
const scaffoldedArticles = factories.createCoreService('api::article.article');
const scaffoldedHomepage = factories.createCoreService('api::homepage.homepage');
const scaffoldedArticleService = scaffoldedArticles({ strapi: app });
const scaffoldedHomepageService = scaffoldedHomepage({ strapi: app });
const scaffoldedCreated = scaffoldedArticleService.create({ data: { title: 'Title' } });
declare const scaffoldedServiceChecks: [
  Expect<
    Equal<
      [typeof scaffoldedArticleService],
      [Core.CoreAPI.Service.ContentType<'api::article.article'>]
    >
  >,
  Expect<
    Equal<
      [typeof scaffoldedHomepageService],
      [Core.CoreAPI.Service.ContentType<'api::homepage.homepage'>]
    >
  >,
  Expect<Equal<[Awaited<typeof scaffoldedCreated>['title']], [string | null]>>,
];
scaffoldedServiceChecks satisfies unknown;
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void scaffoldedArticleService.create({ data: { title: 'Title' }, lookup: { locale: 'fr' } });
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void scaffoldedArticleService.update('a', { data: { views: 1 }, lookup: { locale: 'fr' } });
// @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
void scaffoldedArticleService.delete('a', { lookup: { locale: 'fr' } });
void scaffoldedHomepageService.createOrUpdate({
  data: { title: 'Title' },
  // @ts-expect-error The Document Service builds `lookup` itself and rejects one from the caller.
  lookup: { locale: 'fr' },
});

// Known gap (filters): filter values are not checked against the attribute type. This compiles,
// so it is not an `@ts-expect-error` case.
void articles.findMany({ filters: { views: { $eq: 'not a number' } } });

// `use()` returns the function that removes the middleware, as at runtime.
const removeMiddleware = app.documents.use(async (_context, next) => next());
removeMiddleware satisfies () => void;
// @ts-expect-error `use()` does not return the service, so calls cannot be chained.
app.documents.use(async (_context, next) => next()).use(async (_context, next) => next());

// The core service passes `status` to the Document Service's `delete`, which throws
// `Cannot delete a draft document` on a draft and publish content type.
// @ts-expect-error A draft and publish document cannot be deleted by its draft version
void articleService.delete('a', { status: 'draft' });
// @ts-expect-error A draft and publish document cannot be deleted by its draft version
void homepageService.delete({ status: 'draft' });
void articleService.delete('a', { status: 'published' });
declare const categoryService: Core.CoreAPI.Service.ContentType<'api::category.category'>;
void categoryService.delete('a', { status: 'draft' });

// With generated schemas, a union of UIDs that includes a draft and publish content type only
// accepts `published`: `draft` throws for that member.
declare const articleOrCategory: 'api::article.article' | 'api::category.category';
declare const anyContentType: import('@strapi/strapi').UID.ContentType;
// @ts-expect-error `draft` throws for the draft and publish member
void app.documents(articleOrCategory).delete({ documentId: 'a', status: 'draft' });
// @ts-expect-error `draft` throws if the UID has draft and publish enabled
void app.documents(anyContentType).delete({ documentId: 'a', status: 'draft' });
void app.documents(articleOrCategory).delete({ documentId: 'a', status: 'published' });
void app.documents('api::category.category').delete({ documentId: 'a', status: 'draft' });
