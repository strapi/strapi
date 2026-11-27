// Database lifecycles in strict mode: the per-model `lifecycles.ts` of a content type, and
// `strapi.db.lifecycles.subscribe`. Its own program.
// Runtime evidence: the examples/getstarted event recorder (every event of a scripted set of
// Document Service and Query Engine calls, and the value kinds of each attribute).
import type { Core, Data, Modules, Schema, Struct } from '@strapi/strapi';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'lc_articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  options: { draftAndPublish: true };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    slug: Schema.Attribute.UID<'title'>;
    views: Schema.Attribute.Integer;
    publishedOn: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
  };
}

interface TagSchema extends Struct.CollectionTypeSchema {
  collectionName: 'lc_tags';
  info: { singularName: 'tag'; pluralName: 'tags'; displayName: 'Tag' };
  attributes: {
    name: Schema.Attribute.String;
  };
}

interface SeoSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: { displayName: 'Seo' };
  attributes: { label: Schema.Attribute.String };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppContentTypeSchemas {
        'api::article.article': ArticleSchema;
        'api::tag.tag': TagSchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
      }
    }
  }
}

// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
type Equal<A, B> =
  (<T>() => T extends [A] ? 1 : 2) extends <T>() => T extends [B] ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// 1. Per-model lifecycles file (src/api/article/content-types/article/lifecycles.ts)
export const articleLifecycles = {
  beforeCreate(event) {
    const { data } = event.params;
    // `data` is checked by the query after `before*`: it may be missing.
    if (data !== undefined && typeof data.title === 'string') {
      data.title = data.title.trim();
    }
    // @ts-expect-error `titel` is not an attribute of the article.
    void data?.titel;
    // @ts-expect-error `before*` events have no result.
    void event.result;
    type _Action = Expect<Equal<typeof event.action, 'beforeCreate'>>;
    type _Uid = Expect<Equal<typeof event.model.uid, 'api::article.article'>>;
    type _State = Expect<Equal<typeof event.state, Record<string, unknown>>>;
  },
  afterCreate(event) {
    // The entry read back after the insert: registered attribute values.
    const title: string | null | undefined = event.result.title;
    const views: number | null | undefined = event.result.views;
    const id: Data.ID = event.result.id;
    void [title, views, id];
    // `after*` params went through the query: `data` is there.
    void event.params.data.title;
  },
  afterUpdate(event) {
    // The entry read back after the update.
    const documentId: string = event.result.documentId;
    void documentId;
  },
  afterFindMany(event) {
    // An array of entries.
    for (const entry of event.result) {
      void entry.documentId;
    }
  },
  afterFindOne(event) {
    // `null` when no entry matched.
    // @ts-expect-error the result may be null.
    void event.result.title;
    void event.result?.title;
  },
  afterCount(event) {
    const count: number = event.result;
    void count;
  },
  afterCreateMany(event) {
    const ids: Data.ID[] = event.result.ids;
    void ids;
  },
  afterDeleteMany(event) {
    const count: number = event.result.count;
    void count;
  },
  beforeDelete(event) {
    // `where` is what the caller passed: unknown.
    const { where } = event.params;
    // @ts-expect-error `where` may be missing before the query checks it.
    void where.id;
    const id: unknown = where?.id;
    void id;
    // @ts-expect-error `where` keys are the attributes, `id`, `documentId` and logical operators.
    void where?.titel;
  },
  // The runtime awaits a hook and ignores its result.
  async afterDelete() {
    return 1;
  },
} satisfies Core.Lifecycles<'api::article.article'>;

export const rejectsUnknownHook = {
  // @ts-expect-error `beforeSave` is not a lifecycle action (the loader rejects unknown keys).
  beforeSave() {},
} satisfies Core.Lifecycles<'api::article.article'>;

// 2. `strapi.db.lifecycles.subscribe` with registered models: hooks receive the events of the
// models in `models`, the only ones the subscriber runs for.
declare const strapi: Core.Strapi;

strapi.db.lifecycles.subscribe({
  models: ['api::article.article', 'api::tag.tag'],
  afterUpdate(event) {
    // A union of the two models' events. TypeScript does not narrow a union by a nested property
    // (`event.model.uid`), so narrow the entry with `in`, or subscribe once per model.
    // @ts-expect-error `title` is not on a tag.
    void event.result.title;
    if ('title' in event.result) {
      const title: string | null | undefined = event.result.title;
      void title;
    }
    type _Uid = Expect<Equal<typeof event.model.uid, 'api::article.article' | 'api::tag.tag'>>;
  },
});

strapi.db.lifecycles.subscribe({
  models: ['api::tag.tag'],
  afterCreate(event) {
    const name: string | null | undefined = event.result.name;
    void name;
  },
  beforeUpdate(event) {
    // @ts-expect-error `where` keys are the attributes, `id`, `documentId` and logical operators.
    void event.params.where?.title;
  },
  // @ts-expect-error `afterSave` is not a lifecycle action.
  afterSave() {},
});

// Components are models too: their writes run their own lifecycles.
strapi.db.lifecycles.subscribe({
  models: ['shared.seo'],
  afterCreate(event) {
    const label: string | null | undefined = event.result.label;
    void label;
  },
});

// 3. Dynamic models, unregistered models and subscribers for every model receive untyped events.
declare const dynamicModels: string[];
strapi.db.lifecycles.subscribe({
  models: dynamicModels,
  afterDeleteMany(event) {
    const uid: string = event.model.uid;
    const count: number = event.result.count;
    void [uid, count];
  },
});

strapi.db.lifecycles.subscribe({
  models: ['api::unregistered.unregistered'],
  afterFindOne(event) {
    type _Result = Expect<Equal<typeof event.result, Record<string, unknown> | null>>;
  },
});

strapi.db.lifecycles.subscribe({
  afterCreate(event) {
    // @ts-expect-error entries of an unknown model are records of unknown values.
    const title: string = event.result['title'];
    void title;
  },
});

strapi.db.lifecycles.subscribe((event) => {
  if (event.action === 'afterFindMany') {
    const rows: Record<string, unknown>[] = event.result;
    void rows;
  }
});

// `subscribe` returns the unsubscribe function, and `strapi.db` stays a database where code takes one.
export const unsubscribe: () => void = strapi.db.lifecycles.subscribe({ models: ['api::tag.tag'] });
type _Db = Expect<Equal<typeof strapi.db, Modules.Lifecycles.StrictDatabase>>;

// 4. The action and query names.
type _Query = Expect<Equal<Modules.Lifecycles.Query<'beforeCreateMany'>, 'createMany'>>;
type _Entry = Expect<
  Equal<Modules.Lifecycles.Entry<'api::tag.tag'>, Data.ContentType<'api::tag.tag'>>
>;
