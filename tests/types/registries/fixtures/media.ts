// Media values and inputs with strict types. Its own program, with the contracts of the bundled
// packages (`strapi-strict.d.ts`): `plugin::upload.file` is the upload plugin's schema. Without strict
// types, `media-permissive.ts` checks develop's loose types.
import type { Core, Data, Modules, Schema, Struct } from '@strapi/strapi';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'media_articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  options: { draftAndPublish: false };
  attributes: {
    title: Schema.Attribute.String;
    cover: Schema.Attribute.Media<'images'>;
    hero: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    gallery: Schema.Attribute.Media<'images' | 'files', true>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    body: Schema.Attribute.Blocks;
  };
}

interface SeoSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: { displayName: 'Seo' };
  attributes: { image: Schema.Attribute.Media<'images'> };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppContentTypeSchemas {
        'api::article.article': ArticleSchema;
      }
      interface ComponentSchemas {
        'shared.seo': SeoSchema;
      }
    }
  }
}

declare const app: Core.Strapi;
const articles = app.documents('api::article.article');

// A single media takes one file: an ID, `{ id }` or `{ documentId }`, or `null`.
void articles.create({ data: { hero: 12, cover: { id: 13 } } });
void articles.update({ documentId: 'a', data: { cover: { documentId: 'abc', locale: 'fr' } } });
void articles.update({ documentId: 'a', data: { cover: null } });
// @ts-expect-error A single media takes one file, not an array.
void articles.update({ documentId: 'a', data: { cover: [12] } });
// @ts-expect-error A single media takes no `connect`.
void articles.update({ documentId: 'a', data: { cover: { connect: [12] } } });

// A multiple media takes the to-many relation formats.
void articles.update({ documentId: 'a', data: { gallery: [12, 13] } });
void articles.update({ documentId: 'a', data: { gallery: [{ id: 12 }, { documentId: 'abc' }] } });
void articles.update({ documentId: 'a', data: { gallery: { connect: [12], disconnect: [13] } } });
void articles.update({ documentId: 'a', data: { gallery: { set: [{ id: 12 }] } } });
void articles.update({ documentId: 'a', data: { gallery: null } });
// The types accept `connect` on create, as for relations, but the runtime attaches no file
// (https://github.com/strapi/strapi/issues/27989).
void articles.create({ data: { hero: 12, gallery: { connect: [13] } } });
// @ts-expect-error An array holds IDs or objects, not both.
void articles.update({ documentId: 'a', data: { gallery: [12, { id: 13 }] } });
// @ts-expect-error A multiple media takes an array, not a single ID.
void articles.update({ documentId: 'a', data: { gallery: 12 } });

// Media in a component take the same inputs.
void articles.update({ documentId: 'a', data: { seo: { image: 12 } } });
// @ts-expect-error A single media takes one file, not an array.
void articles.update({ documentId: 'a', data: { seo: { image: [12] } } });

// Typed object literals are checked for extra fields: a file input holds an ID or a document ID, and
// `connect` takes no `position` (the runtime always appends the file).
type ArticleInput = Modules.Documents.Params.Data.Input<'api::article.article'>;
type ArticleUpdate = Modules.Documents.Params.Write.UpdateInput<'api::article.article'>;
export const fileIds: ArticleInput = { hero: 1, cover: { id: 2 }, gallery: [{ id: 3 }] };
// @ts-expect-error `url` is not a file input field.
export const withFileFields: ArticleInput = { hero: 1, cover: { id: 1, url: '/a.png' } };
export const positioned: ArticleUpdate = {
  // @ts-expect-error `connect` takes no `position`.
  gallery: { connect: [{ id: 1, position: { end: true } }] },
};
// Inline calls infer their params, which TypeScript does not check for extra fields.
void articles.update({ documentId: 'a', data: { cover: { id: 1, url: '/a.png' } } });

// Code that reads a multiple media input narrows it to an array first.
declare const input: ArticleInput;
export const galleryCount = Array.isArray(input.gallery) ? input.gallery.length : 0;
// @ts-expect-error The input may be a `connect`, `disconnect` or `set` object.
export const galleryLength: number = input.gallery.length;

// The deprecated Entity Service keeps develop's loose media input.
void app.entityService.update('api::article.article', 1, {
  data: { cover: [12], gallery: [12, { id: 13 }] },
});

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

// Populated media are upload file documents, as a populated relation is its target's document. An
// empty single media is `null`, an empty multiple media `[]`.
type File = Data.ContentType<'plugin::upload.file'>;
const populated = articles.findOne({ documentId: 'a', populate: ['cover', 'gallery', 'seo'] });
type Populated = NonNullable<Awaited<typeof populated>>;
type ImageBlockNode = Extract<NonNullable<Populated['body']>[number], { type: 'image' }>;

declare const outputChecks: [
  Expect<Equal<Populated['cover'], File | null>>,
  Expect<Equal<Populated['gallery'], File[]>>,
  Expect<Equal<NonNullable<Populated['seo']>['image'], File | null | undefined>>,
  Expect<Equal<Data.ContentType<'api::article.article'>['hero'], File | null | undefined>>,
  // An image node holds a copy of some file fields, taken when the image was inserted.
  Expect<IsAny<ImageBlockNode['image']>>,
];
outputChecks satisfies unknown;

export async function readCover() {
  const article = await populated;

  if (article === null || article.cover === null) return undefined;

  const url: string | null | undefined = article.cover.url;
  // @ts-expect-error `formats` is a JSON attribute: its keys are not known.
  const thumbnail = article.cover.formats.thumbnail;

  return { url, thumbnail };
}
