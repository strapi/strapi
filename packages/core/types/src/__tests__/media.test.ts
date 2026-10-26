import type * as Data from '../data';
import type * as Modules from '../modules';
import type * as Schema from '../schema';
import type * as Struct from '../struct';

type Assert<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsNotAny<T> = IsAny<T> extends true ? false : true;
type StrictEqual<TValue, TExpected> =
  (<T>() => T extends TValue ? 1 : 2) extends <T>() => T extends TExpected ? 1 : 2
    ? (<T>() => T extends TExpected ? 1 : 2) extends <T>() => T extends TValue ? 1 : 2
      ? true
      : false
    : false;

interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

interface ApiArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    singularName: 'article';
    pluralName: 'articles';
    displayName: 'Article';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    title: Schema.Attribute.String;
    cover: Schema.Attribute.Media<'images'>;
    gallery: Schema.Attribute.Media<'images', true>;
  };
}

declare module '../public/registries' {
  interface ContentTypeSchemas {
    'plugin::upload.file': PluginUploadFile;
    'api::article.article': ApiArticle;
  }
}

type UploadFile = Data.ContentType<'plugin::upload.file'>;
type Article = Data.ContentType<'api::article.article'>;
type DocumentInput = Modules.Documents.Params.Data.Input<'api::article.article'>;
type EntityInput = Modules.EntityService.Params.Data.Input<'api::article.article'>;

export type TestSingleMediaValue = Assert<
  StrictEqual<Schema.Attribute.MediaValue<false>, UploadFile>
>;
export type TestMultipleMediaValue = Assert<
  StrictEqual<Schema.Attribute.MediaValue<true>, UploadFile[]>
>;
export type TestMediaOutputIsNotAny = Assert<IsNotAny<NonNullable<Article['cover']>>>;
export type TestMediaOutputHasUploadFileFields = Assert<
  StrictEqual<NonNullable<Article['cover']>['url'], string | null | undefined>
>;
export type TestMultipleMediaOutputHasUploadFileFields = Assert<
  StrictEqual<NonNullable<Article['gallery']>[number]['url'], string | null | undefined>
>;
export type TestMediaInputIsNotAny = Assert<IsNotAny<NonNullable<DocumentInput['cover']>>>;
export type TestBothServicesAcceptTheSameMediaInputs = Assert<
  StrictEqual<Pick<DocumentInput, 'cover' | 'gallery'>, Pick<EntityInput, 'cover' | 'gallery'>>
>;

// Writes use file references; they must not require populated output entities.
export const documentMediaInputs: DocumentInput[] = [
  { cover: 1 },
  { cover: '1' },
  { cover: { id: 1 } },
  { cover: null },
  { gallery: [1, 2] },
  { gallery: ['1', '2'] },
  { gallery: [{ id: 1 }, { id: '2' }] },
  { gallery: [1, { id: 2 }] },
  { gallery: [] },
  { gallery: null },
  { gallery: { set: [1, { id: 2 }] } },
  { gallery: { connect: [1, { id: 2, position: { before: 3 } }], disconnect: [4] } },
];
export const entityMediaInputs: EntityInput[] = documentMediaInputs;

// A populated result is also a valid reference when passed back to either API.
export function usePopulatedMedia(file: UploadFile): [DocumentInput, EntityInput] {
  return [
    { cover: file, gallery: [file] },
    { cover: file, gallery: [file] },
  ];
}

// @ts-expect-error A boolean is not a file reference.
export const invalidDocumentCover: DocumentInput = { cover: true };
// @ts-expect-error Multiple media requires file references, not boolean values.
export const invalidDocumentGallery: DocumentInput = { gallery: [true] };
// @ts-expect-error A populated result must retain its typed upload fields.
export const invalidOutputUrl: NonNullable<Article['cover']>['url'] = 42;
// @ts-expect-error Entity Service inputs also reject invalid file references.
export const invalidEntityCover: EntityInput = { cover: true };
// @ts-expect-error Upload files use database IDs, not document-only references.
export const invalidMediaDocumentId: DocumentInput = { cover: { documentId: 'file-document' } };
