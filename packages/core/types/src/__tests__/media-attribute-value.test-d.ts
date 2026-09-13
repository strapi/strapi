/**
 * Compile-time regression fixtures for media attribute value resolution, modeling a "normal"
 * fully generated project (content-type registry extended, `plugin::upload.file` included -
 * the shape a real `strapi.d.ts` produces). Covers the read shape (`Documents.Document`),
 * the Document Service write shape (`Documents.Params.Data.Input`), and the Entity Service write
 * shape (`EntityService.Params.Data.Input`) for a content-type with single, multiple, and
 * widened-boolean-multiplicity media attributes.
 *
 * See `media-registry-gating.test-d.ts` for why the "unextended" / "component-only" /
 * "selective content" registry states aren't (and can't be) modeled in this same file.
 */
import type { Schema, Struct } from '..';
import type { Documents, EntityService } from '../modules';

interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    singularName: 'article';
    pluralName: 'articles';
    displayName: 'Article';
    description: '';
  };
  options: object;
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    cover: Schema.Attribute.Media<'images'>;
    gallery: Schema.Attribute.Media<'images', true>;
    // Widened/generic multiplicity - covers the non-distributive `If` regression (finding #6).
    flexibleMedia: Schema.Attribute.Media<'images', boolean>;
  };
}

interface UploadFolderSchema extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
    description: '';
  };
  options: object;
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
  };
}

interface UploadFileSchema extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  options: object;
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    alternativeText: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    width: Schema.Attribute.Integer;
    height: Schema.Attribute.Integer;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    ext: Schema.Attribute.String;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.String;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    related: Schema.Attribute.Relation<'morphToMany'>;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
  };
}

declare module '../public/registries' {
  export interface ContentTypeSchemas {
    'api::article.article': ArticleSchema;
    'plugin::upload.folder': UploadFolderSchema;
    'plugin::upload.file': UploadFileSchema;
  }
}

type ArticleUID = 'api::article.article';

// --- Read shape (`strapi.documents(...)` results) ---

type ArticleDocument = Documents.Document<ArticleUID>;

// Single media resolves to the file's scalar shape, plus runtime-only `isUrlSigned` (finding #5).
export declare const cover: ArticleDocument['cover'];
export const coverExample: ArticleDocument['cover'] = {
  id: 1,
  documentId: 'abc',
  name: 'photo.png',
  hash: 'abc123',
  mime: 'image/png',
  size: 10,
  url: '/uploads/photo.png',
  provider: 'local',
  isUrlSigned: true,
};

// Nested populate access stays available (finding #4) - `folder` is a relation on the file
// schema, previously excluded via `NonPopulatableAttributeNames`.
type CoverFolder = NonNullable<ArticleDocument['cover']>['folder'];
export declare const coverFolderName: NonNullable<CoverFolder>['name'];

// Multiple media resolves to an array of the same shape.
export const galleryExample: ArticleDocument['gallery'] = [coverExample];

// Widened multiplicity resolves to a union of both shapes rather than collapsing to the
// single-media branch (finding #6).
export const flexibleAsSingle: ArticleDocument['flexibleMedia'] = coverExample;
export const flexibleAsMany: ArticleDocument['flexibleMedia'] = [coverExample];

// --- Document Service write shape ---

type ArticleDocumentInput = Documents.Params.Data.Input<ArticleUID>;

export const createSingleById: ArticleDocumentInput['cover'] = 1;
export const createSingleByIdObject: ArticleDocumentInput['cover'] = { id: 1 };
export const connectMany: ArticleDocumentInput['gallery'] = { connect: [1, 2] };
export const setMany: ArticleDocumentInput['gallery'] = { set: [{ id: 1 }] };
export const disconnectMany: ArticleDocumentInput['gallery'] = { disconnect: [1] };

// Runtime-unsupported `documentId` long-hand must be rejected (finding #1 - the data-loss risk):
// media persistence only ever reads `.id`, so a type-valid `documentId` update would silently
// drop the existing association instead of applying it.
// @ts-expect-error - media inputs don't support the relation `documentId` long-hand.
export const rejectDocumentIdSingle: ArticleDocumentInput['cover'] = { documentId: 'abc' };
// @ts-expect-error - same restriction applies inside `connect`/`set`/`disconnect`.
export const rejectDocumentIdInConnect: ArticleDocumentInput['gallery'] = {
  connect: [{ documentId: 'abc' }],
};

// --- Entity Service write shape (finding #3 / the separate reviewer comment) ---

type ArticleEntityInput = EntityService.Params.Data.Input<ArticleUID>;

export const entitySingleById: ArticleEntityInput['cover'] = 1;
export const entitySingleByIdObject: ArticleEntityInput['cover'] = { id: 1 };
export const entityConnectMany: ArticleEntityInput['gallery'] = { connect: [1, 2] };

// @ts-expect-error - same `documentId` restriction applies to Entity Service media inputs.
export const entityRejectDocumentId: ArticleEntityInput['cover'] = { documentId: 'abc' };
