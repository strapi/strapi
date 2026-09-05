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
type ArticleValues = Modules.Documents.Params.Attribute.GetValues<'api::article.article'>;

export type TestSingleMediaValue = Assert<
  StrictEqual<Schema.Attribute.MediaValue<false>, UploadFile>
>;
export type TestMultipleMediaValue = Assert<
  StrictEqual<Schema.Attribute.MediaValue<true>, UploadFile[]>
>;

export type TestDocumentParamsSingleMedia = Assert<
  StrictEqual<ArticleValues['cover'], UploadFile | undefined>
>;
export type TestDocumentParamsMultipleMedia = Assert<
  StrictEqual<ArticleValues['gallery'], UploadFile[] | undefined>
>;

export type TestMediaValueIsNotAny = Assert<IsNotAny<NonNullable<ArticleValues['cover']>>>;
export type TestMediaValueHasUploadFileFields = Assert<
  StrictEqual<NonNullable<ArticleValues['cover']>['url'], string | null | undefined>
>;
