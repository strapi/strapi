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
        'api::page.page': PageSchema;
        'api::note.note': NoteSchema;
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
// Known gap (filters): filter values are not checked against the attribute type. This compiles,
// so it is not an `@ts-expect-error` case.
void articles.findMany({ filters: { views: { $eq: 'not a number' } } });

// `use()` returns the function that removes the middleware, as at runtime.
const removeMiddleware = app.documents.use(async (_context, next) => next());
removeMiddleware satisfies () => void;
// @ts-expect-error `use()` does not return the service, so calls cannot be chained.
app.documents.use(async (_context, next) => next()).use(async (_context, next) => next());
