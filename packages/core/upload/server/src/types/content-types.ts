import type { Schema, Struct } from '@strapi/types';

/**
 * The schema of `plugin::upload.file` once loaded (`../content-types/file.ts`), as type generation
 * writes it for an application that does not extend it. Named `FileSchema` because `File` is the
 * row type of the upload services.
 */
export interface FileSchema extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: Struct.WithSystemAttributes<
    'plugin::upload.file',
    {
      name: Schema.Attribute.String & Schema.Attribute.Required;
      alternativeText: Schema.Attribute.Text;
      caption: Schema.Attribute.Text;
      focalPoint: Schema.Attribute.JSON;
      width: Schema.Attribute.Integer;
      height: Schema.Attribute.Integer;
      formats: Schema.Attribute.JSON;
      hash: Schema.Attribute.String & Schema.Attribute.Required;
      ext: Schema.Attribute.String;
      mime: Schema.Attribute.String & Schema.Attribute.Required;
      size: Schema.Attribute.Decimal & Schema.Attribute.Required;
      url: Schema.Attribute.Text & Schema.Attribute.Required;
      previewUrl: Schema.Attribute.Text;
      provider: Schema.Attribute.String & Schema.Attribute.Required;
      provider_metadata: Schema.Attribute.JSON;
      related: Schema.Attribute.Relation<'morphToMany'>;
      folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
        Schema.Attribute.Private;
      folderPath: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.Private &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
    }
  >;
}

/**
 * The schema of `plugin::upload.folder` once loaded (`../content-types/folder.ts`), as type
 * generation writes it for an application that does not extend it.
 */
export interface FolderSchema extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: Struct.WithSystemAttributes<
    'plugin::upload.folder',
    {
      name: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
      pathId: Schema.Attribute.Integer & Schema.Attribute.Required & Schema.Attribute.Unique;
      parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
      children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
      files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
      path: Schema.Attribute.String &
        Schema.Attribute.Required &
        Schema.Attribute.SetMinMaxLength<{ minLength: 1 }>;
    }
  >;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageContentTypeSchemas {
        'plugin::upload.file': FileSchema;
        'plugin::upload.folder': FolderSchema;
      }
    }
  }
}
