// Document Service write inputs (`data` of create, update, clone) in strict mode. Its own program.
// Each call states the runtime outcome: an `@ts-expect-error` call fails at runtime, the others pass.
// Runtime evidence: the entity validator (`packages/core/core/src/services/entity-validator`) and the
// field optionality plan's validator probe and API proofs.
import type { Core, Data, Modules, Schema, Struct, UID } from '@strapi/strapi';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'write_articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  options: { draftAndPublish: true };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    subtitle: Schema.Attribute.String;
    kind: Schema.Attribute.Enumeration<['news', 'blog']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'news'>;
    featured: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    views: Schema.Attribute.Integer;
    tags: Schema.Attribute.Component<'shared.tag', true> & Schema.Attribute.Required;
    blocks: Schema.Attribute.DynamicZone<['shared.tag', 'shared.seo']> & Schema.Attribute.Required;
    extras: Schema.Attribute.Component<'shared.tag', true>;
    seo: Schema.Attribute.Component<'shared.seo', false> & Schema.Attribute.Required;
    author: Schema.Attribute.Relation<'manyToOne', 'api::author.author'> &
      Schema.Attribute.Required;
    cover: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    teaser: Schema.Attribute.Text &
      Schema.Attribute.Required & { conditions: { visible: { '==': [{ var: 'kind' }, 'blog'] } } };
    target: Schema.Attribute.Relation<'morphToOne'>;
  };
}

interface AuthorSchema extends Struct.CollectionTypeSchema {
  collectionName: 'write_authors';
  info: { singularName: 'author'; pluralName: 'authors'; displayName: 'Author' };
  options: { draftAndPublish: false };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    bio: Schema.Attribute.Text & Schema.Attribute.Required & Schema.Attribute.DefaultTo<'n/a'>;
  };
}

interface SeoSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: { displayName: 'Seo' };
  attributes: {
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    metaDesc: Schema.Attribute.String;
  };
}

interface TagSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_tags';
  info: { displayName: 'Tag' };
  attributes: { name: Schema.Attribute.String & Schema.Attribute.Required };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface ContentTypeSchemas {
        'api::article.article': ArticleSchema;
        'api::author.author': AuthorSchema;
        // A schema whose attributes are not known: the write inputs fall back to develop's input.
        'api::loose.loose': Struct.CollectionTypeSchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
        'shared.tag': TagSchema;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type RequiredKeys<T> = keyof {
  [TKey in keyof T as Record<never, never> extends Pick<T, TKey> ? never : TKey]: T[TKey];
};

declare const app: Core.Strapi;
const articles = app.documents('api::article.article');
const authors = app.documents('api::author.author');
declare const anyStatus: 'draft' | 'published';

const published = {
  title: 'Title',
  tags: [{ name: 'a' }],
  blocks: [{ __component: 'shared.tag' as const, name: 'a' }],
  seo: { metaTitle: 'Meta' },
};
const { title, ...withoutTitle } = published;
const { seo, ...withoutSeo } = published;
void [title, seo];

// D&P draft create: draft mode skips `required`, except on repeatable components and dynamic zones.
// @ts-expect-error runtime: `tags must be defined`, `blocks must be defined` (probe R2, D2; E2 row 1)
void articles.create({ data: {} });
void articles.create({ data: { tags: [], blocks: [] } }); // E2 row 2
void articles.create({ data: { tags: [], blocks: [], title: null } }); // `null` on required, draft
void articles.create({ data: { tags: [], blocks: [], seo: { metaDesc: 'x' } } }); // probe K3
void articles.create({ data: { tags: [], blocks: [], kind: null } }); // draft stores `null` (C5)
// @ts-expect-error runtime: arrays never accept `null` (probe R5)
void articles.create({ data: { tags: null, blocks: [] } });
// @ts-expect-error runtime: `Create requires data attribute` (entries.ts:45-47)
void articles.create({});

// D&P published create: the publish step validates the draft in publishing mode.
void articles.create({ status: 'published', data: published }); // defaults, relations optional
void articles.create({
  status: 'published',
  data: { ...published, author: null, cover: null, teaser: null }, // relations, media (D2), hidden
});
// @ts-expect-error runtime: `title must be defined` (probe C2, E2 row 7)
void articles.create({ status: 'published', data: withoutTitle });
// @ts-expect-error runtime: an explicit `null` is not replaced by the default (probe C5, E2 row 6)
void articles.create({ status: 'published', data: { ...published, kind: null } });
// @ts-expect-error runtime: `seo must be defined` (probe K2, E2 row 3)
void articles.create({ status: 'published', data: withoutSeo });
// @ts-expect-error runtime: `seo.metaTitle must be defined` (probe K4)
void articles.create({ status: 'published', data: { ...published, seo: { metaDesc: 'x' } } });
// @ts-expect-error runtime: `tags[0].name must be defined` (probe K8)
void articles.create({ status: 'published', data: { ...published, tags: [{}] } });
// @ts-expect-error runtime: `blocks[0].__component is a required field` (probe K10)
void articles.create({ status: 'published', data: { ...published, blocks: [{ name: 'a' }] } });

// Without D&P, every write is a publishing write, whatever the status.
void authors.create({ data: { name: 'Name' } }); // `bio` takes its default (probe C4)
// @ts-expect-error runtime: `name must be defined` (E2 row 11)
void authors.create({ data: {} });
// @ts-expect-error runtime: `name` must be a `string` (probe C3)
void authors.create({ data: { name: null } });

// Update: no key is required; `null` follows the mode.
void articles.update({ documentId: 'd', data: { title: null } }); // probe U3, E2 row 9
// @ts-expect-error runtime: ValidationError on `title` (probe U2, E2 row 10)
void articles.update({ documentId: 'd', status: 'published', data: { title: null } });
void articles.update({ documentId: 'd', data: { subtitle: null } }); // optional field cleared
void articles.update({ documentId: 'd', data: { kind: null } }); // draft
void articles.update({ documentId: 'd' }); // no data
void articles.update({ documentId: 'd', data: { seo: { metaDesc: 'x' } } }); // new component, draft
void articles.update({
  documentId: 'd',
  status: 'published',
  data: { seo: { id: 1, metaDesc: 'x' } },
});
// @ts-expect-error D4: a new component (no `id`) follows the create rules, `metaTitle` is required
void articles.update({ documentId: 'd', status: 'published', data: { seo: { metaDesc: 'x' } } });
void articles.update({
  documentId: 'd',
  data: { blocks: [{ __component: 'shared.seo', id: 1, metaDesc: 'x' }] }, // existing DZ item
});
// @ts-expect-error runtime: arrays never accept `null` (probe N12)
void articles.update({ documentId: 'd', data: { extras: null } });
// @ts-expect-error runtime: arrays never accept `null` (probe N11)
void articles.update({ documentId: 'd', data: { blocks: null } });
void authors.update({ documentId: 'd', data: { name: 'Other' } });
// @ts-expect-error runtime: without D&P, an update is a publishing write (probe U2)
void authors.update({ documentId: 'd', data: { name: null } });

// Clone merges `data` over the source entry: no key is required.
void articles.clone({ documentId: 'd', data: { subtitle: 'x' } }); // B7
void articles.clone({ documentId: 'd' });
// @ts-expect-error runtime: arrays never accept `null`
void articles.clone({ documentId: 'd', data: { tags: null } });

// A status that is not a literal must satisfy both inputs.
// @ts-expect-error `title` and `seo` are required when the status may be `published`
void articles.create({ status: anyStatus, data: { tags: [], blocks: [] } });
void articles.create({ status: anyStatus, data: published });

// Input shapes.
type DraftCreate = Modules.Documents.Params.Write.CreateInput<'api::article.article', 'draft'>;
type PublishedCreate = Modules.Documents.Params.Write.CreateInput<
  'api::article.article',
  'published'
>;
type PublishedUpdate = Modules.Documents.Params.Write.UpdateInput<
  'api::article.article',
  'published'
>;
type AuthorDraft = Modules.Documents.Params.Write.CreateInput<'api::author.author', 'draft'>;
type AuthorPublished = Modules.Documents.Params.Write.CreateInput<
  'api::author.author',
  'published'
>;
type Number = Modules.Documents.Params.Attribute.NumberValue;
declare const shapeChecks: [
  Expect<Equal<RequiredKeys<DraftCreate>, 'tags' | 'blocks'>>,
  Expect<Equal<RequiredKeys<PublishedCreate>, 'title' | 'tags' | 'blocks' | 'seo'>>,
  Expect<Equal<RequiredKeys<PublishedUpdate>, never>>,
  Expect<Equal<DraftCreate['title'], string | null | undefined>>,
  Expect<Equal<PublishedCreate['title'], string>>,
  Expect<Equal<PublishedCreate['kind'], 'news' | 'blog' | undefined>>,
  Expect<Equal<PublishedCreate['views'], Number | null | undefined>>,
  // Morph relations are not writable through `data`.
  Expect<Equal<'target' extends keyof DraftCreate ? true : false, false>>,
  // Without D&P, the draft input is the published one.
  Expect<Equal<AuthorDraft, AuthorPublished>>,
  Expect<
    Equal<Modules.Documents.Params.Write.WriteMode<'api::author.author', 'draft'>, 'published'>
  >,
  // Unknown attributes keep develop's input.
  Expect<
    Equal<
      Modules.Documents.Params.Write.CreateInput<'api::loose.loose', 'published'>,
      Modules.Documents.Params.Data.Input<'api::loose.loose'>
    >
  >,
];
shapeChecks satisfies unknown;

// The core service creates published entries unless the params pass `status: 'draft'`.
declare const articleService: Core.CoreAPI.Service.ContentType<'api::article.article'>;
void articleService.create({ data: published });
void articleService.create({ status: 'draft', data: { tags: [], blocks: [] } });
// @ts-expect-error the core service publishes by default: `title` and `seo` are required
void articleService.create({ data: { tags: [], blocks: [] } });

// Generic callers forward params or data typed by the same UID.
export function forwardCreate<TUID extends UID.ContentType>(
  uid: TUID,
  // The Document Service rejects a `lookup` from the caller.
  params: Modules.Documents.ServiceParams<TUID>['create'] & { lookup?: undefined }
) {
  return app.documents(uid).create(params);
}
export function createDraft<TUID extends UID.ContentType>(
  uid: TUID,
  data: Modules.Documents.Params.Write.CreateInput<TUID, 'draft'>
) {
  return app.documents(uid).create({ status: 'draft' as const, data });
}
void forwardCreate('api::article.article', { data: { tags: [], blocks: [] } });

// A schema with unknown attributes accepts develop's input.
const loose = app.documents('api::loose.loose');
void loose.create({ data: { anything: 'x' } });
void loose.update({ documentId: 'd', data: { anything: 'x' } });

declare const id: Data.ID;
void articles.update({ documentId: 'd', data: { tags: [{ id, name: 'x' }] } });
