// Populated attributes of strict Document Service results. Its own program, with the contracts of the
// bundled packages (`strapi-strict.d.ts`): a populated media is the `plugin::upload.file` document.
// The runtime drops object populate keys set to `false` (`convertPopulateObject` in
// `@strapi/utils`), and `count: true` on a relation populates `{ count: number }`
// (`applyPopulate` in `@strapi/database`). Media ignore `count`: they are populated as files.
import type { Core, Data, Schema, Struct } from '@strapi/strapi';

interface ItemSchema extends Struct.CollectionTypeSchema {
  collectionName: 'populate_items';
  info: { singularName: 'item'; pluralName: 'items'; displayName: 'Item' };
  options: { draftAndPublish: false };
  attributes: {
    title: Schema.Attribute.String;
    tags: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'>;
    author: Schema.Attribute.Relation<'manyToOne', 'api::tag.tag'>;
    cover: Schema.Attribute.Media<'images'>;
    gallery: Schema.Attribute.Media<'images', true>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
  };
}

interface TagSchema extends Struct.CollectionTypeSchema {
  collectionName: 'populate_tags';
  info: { singularName: 'tag'; pluralName: 'tags'; displayName: 'Tag' };
  options: { draftAndPublish: false };
  attributes: {
    name: Schema.Attribute.String;
    parent: Schema.Attribute.Relation<'manyToOne', 'api::tag.tag'>;
  };
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
        'api::item.item': ItemSchema;
        'api::tag.tag': TagSchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
      }
    }
  }
}

declare const app: Core.Strapi;
declare const flag: boolean;
const items = app.documents('api::item.item');

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type Entry<T> = Awaited<T> extends (infer TItem)[] ? TItem : Awaited<T>;
type HasKey<T, TKey extends PropertyKey> = TKey extends keyof T ? true : false;
type IsOptional<T, TKey extends keyof T> =
  Partial<Pick<T, TKey>> extends Pick<T, TKey> ? true : false;

type Tag = Data.ContentType<'api::tag.tag'>;
type File = Data.ContentType<'plugin::upload.file'>;
type Count = { count: number };

type Scalars = 'id' | 'documentId' | 'title';

// `false` populates nothing: the key is absent.
const none = items.findMany({ populate: { tags: false } });
const mixed = items.findMany({ populate: { tags: true, author: false, cover: false, seo: false } });
// A dynamic boolean may populate: the key is optional.
const dynamic = items.findMany({ populate: { tags: flag } });
// `count: true` on a relation populates its count, for to-many and to-one relations.
const counted = items.findMany({ populate: { tags: { count: true }, author: { count: true } } });
const notCounted = items.findMany({ populate: { tags: { count: false } } });
const maybeCounted = items.findMany({ populate: { tags: { count: flag } } });
// Media ignore `count`: they are populated as files.
const mediaCounted = items.findMany({
  populate: { cover: { count: true }, gallery: { count: true } },
});
// Nested params do not change the populated value.
const nested = items.findMany({
  populate: { tags: { fields: ['name'], populate: { parent: true } }, author: { populate: '*' } },
});
// A union of populate objects populates a key in every member, and may populate it in some.
const unionSame = items.findMany({ populate: flag ? { tags: true } : { tags: false } });
const unionOther = items.findMany({ populate: flag ? { tags: true } : { author: true } });
const unionCount = items.findMany({ populate: flag ? { tags: true } : { tags: { count: true } } });

// Unchanged notations: every listed key is populated.
const wildcard = items.findMany({ populate: '*' });
const list = items.findMany({ populate: ['tags', 'cover'] });
const single = items.findMany({ populate: 'tags' });
const object = items.findMany({ populate: { tags: true, gallery: true, seo: true } });
const one = items.findOne({ documentId: 'a', populate: { tags: false, author: true } });

declare const checks: [
  Expect<Equal<keyof Entry<typeof none>, Scalars>>,
  Expect<Equal<keyof Entry<typeof mixed>, Scalars | 'tags'>>,
  Expect<Equal<Entry<typeof mixed>['tags'], Tag[]>>,

  Expect<Equal<HasKey<Entry<typeof dynamic>, 'tags'>, true>>,
  Expect<Equal<IsOptional<Entry<typeof dynamic>, 'tags'>, true>>,
  Expect<Equal<NonNullable<Entry<typeof dynamic>['tags']>, Tag[]>>,

  Expect<Equal<Entry<typeof counted>['tags'], Count>>,
  Expect<Equal<Entry<typeof counted>['author'], Count>>,
  Expect<Equal<IsOptional<Entry<typeof counted>, 'tags'>, false>>,
  Expect<Equal<Entry<typeof notCounted>['tags'], Tag[]>>,
  Expect<Equal<Entry<typeof maybeCounted>['tags'], Tag[] | Count>>,

  Expect<Equal<Entry<typeof mediaCounted>['cover'], File | null>>,
  Expect<Equal<Entry<typeof mediaCounted>['gallery'], File[]>>,

  Expect<Equal<Entry<typeof nested>['tags'], Tag[]>>,
  Expect<Equal<Entry<typeof nested>['author'], Tag | null>>,

  Expect<Equal<IsOptional<Entry<typeof unionSame>, 'tags'>, true>>,
  Expect<Equal<NonNullable<Entry<typeof unionSame>['tags']>, Tag[]>>,
  Expect<Equal<IsOptional<Entry<typeof unionOther>, 'tags'>, true>>,
  Expect<Equal<IsOptional<Entry<typeof unionOther>, 'author'>, true>>,
  Expect<Equal<IsOptional<Entry<typeof unionCount>, 'tags'>, false>>,
  Expect<Equal<Entry<typeof unionCount>['tags'], Tag[] | Count>>,

  Expect<
    Equal<keyof Entry<typeof wildcard>, Scalars | 'tags' | 'author' | 'cover' | 'gallery' | 'seo'>
  >,
  Expect<Equal<IsOptional<Entry<typeof wildcard>, 'tags'>, false>>,
  Expect<Equal<keyof Entry<typeof list>, Scalars | 'tags' | 'cover'>>,
  Expect<Equal<Entry<typeof list>['cover'], File | null>>,
  Expect<Equal<keyof Entry<typeof single>, Scalars | 'tags'>>,
  Expect<Equal<keyof Entry<typeof object>, Scalars | 'tags' | 'gallery' | 'seo'>>,
  Expect<Equal<Entry<typeof object>['gallery'], File[]>>,
  Expect<Equal<keyof NonNullable<Awaited<typeof one>>, Scalars | 'author'>>,
];
checks satisfies unknown;

export async function reads() {
  const [unpopulated] = await none;
  const [count] = await counted;
  const [maybe] = await dynamic;
  return [
    // @ts-expect-error `populate: { tags: false }` leaves `tags` out.
    unpopulated?.tags,
    // @ts-expect-error `count: true` populates `{ count: number }`, not the tags.
    count?.tags.map((tag) => tag.name),
    count?.tags.count.toFixed(),
    // @ts-expect-error A dynamic boolean may leave `tags` out.
    maybe?.tags.map((tag) => tag.name),
    maybe?.tags?.map((tag) => tag.name),
  ];
}
