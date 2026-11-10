// Media values and inputs without strict types keep develop's loose types: `any` for a single media,
// `any[]` for a multiple one. Its own program. The upload file document and the relation input
// formats are strict-only (`media.ts`).
import type { Core, Data, Modules, Schema, Struct } from '@strapi/strapi';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'media_articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  attributes: {
    cover: Schema.Attribute.Media<'images'>;
    gallery: Schema.Attribute.Media<'images' | 'files', true>;
    photos: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
    body: Schema.Attribute.Blocks;
  };
}

declare module '@strapi/strapi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export module Public {
    export interface ContentTypeSchemas {
      'api::article.article': ArticleSchema;
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

type Article = Data.ContentType<'api::article.article'>;
type ArticleInput = Modules.Documents.Params.Data.Input<'api::article.article'>;
type ImageBlockNode = Extract<Schema.Attribute.BlocksValue[number], { type: 'image' }>;

declare const checks: [
  Expect<IsAny<Article['cover']>>,
  Expect<Equal<Article['gallery'], any[] | null | undefined>>,
  Expect<IsAny<ArticleInput['cover']>>,
  Expect<Equal<ArticleInput['photos'], any[]>>,
  Expect<IsAny<ImageBlockNode['image']>>,
];
checks satisfies unknown;

declare const app: Core.Strapi;
const articles = app.documents('api::article.article');

// Inputs: a single media takes any value, a multiple one any array.
void articles.update({ documentId: 'a', data: { cover: 12 } });
void articles.update({ documentId: 'a', data: { cover: [12] } });
void articles.update({ documentId: 'a', data: { cover: { connect: [12] } } });
void articles.update({ documentId: 'a', data: { gallery: [12, { id: 13 }] } });
void articles.update({ documentId: 'a', data: { gallery: null } });
// @ts-expect-error The relation input formats are strict-only on multiple media.
void articles.update({ documentId: 'a', data: { gallery: { connect: [12] } } });

// Typed inputs accept file objects with more fields, and read as arrays.
export const typedInput: ArticleInput = { photos: [], cover: { id: 1, url: '/a.png' } };
declare const input: ArticleInput;
export const photoUrls = input.photos.map((file) => file.url);
export const photoCount: number = input.photos.length;
export const photos: any[] = input.photos;

// Outputs: populated media keep any shape.
export async function readArticle() {
  const article = await articles.findOne({ documentId: 'a', populate: ['cover', 'gallery'] });

  if (article === null) return;

  const thumbnail: string = article.cover.formats.thumbnail.url;
  const urls = article.gallery?.map((file: { url: string }) => file.url);
  const value: Schema.Attribute.MediaValue = { url: '/a.png' };
  const assets: Schema.Attribute.MediaValue<true> = [{ id: 1, url: '/a.png', mime: 'image/png' }];

  return { thumbnail, urls, value, assets };
}
