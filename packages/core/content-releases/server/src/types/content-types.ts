import type { Schema, Struct } from '@strapi/types';

// Each schema is the one type generation writes for an application, from the runtime schema in
// `../content-types/`. The plugin registers both content types whatever the license, so that their
// data survives a disabled feature (`../index.ts`). Names end in `Schema` because `Release` and
// `ReleaseAction` are the row types of the content-releases contracts.

/** The schema of `plugin::content-releases.release` once loaded (`../content-types/release`). */
export interface ReleaseSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    singularName: 'release';
    pluralName: 'releases';
    displayName: 'Release';
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
    'plugin::content-releases.release',
    {
      name: Schema.Attribute.String & Schema.Attribute.Required;
      releasedAt: Schema.Attribute.DateTime;
      scheduledAt: Schema.Attribute.DateTime;
      timezone: Schema.Attribute.String;
      status: Schema.Attribute.Enumeration<['ready', 'blocked', 'failed', 'done', 'empty']> &
        Schema.Attribute.Required;
      actions: Schema.Attribute.Relation<'oneToMany', 'plugin::content-releases.release-action'>;
    }
  >;
}

/**
 * The schema of `plugin::content-releases.release-action` once loaded
 * (`../content-types/release-action`). The runtime schema defines `locale`, but i18n replaces it
 * with the private `locale` of a content type that is not localized, so it is left to
 * `Struct.WithSystemAttributes`.
 */
export interface ReleaseActionSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    singularName: 'release-action';
    pluralName: 'release-actions';
    displayName: 'Release Action';
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
    'plugin::content-releases.release-action',
    {
      type: Schema.Attribute.Enumeration<['publish', 'unpublish']> & Schema.Attribute.Required;
      contentType: Schema.Attribute.String & Schema.Attribute.Required;
      entryDocumentId: Schema.Attribute.String;
      release: Schema.Attribute.Relation<'manyToOne', 'plugin::content-releases.release'>;
      isEntryValid: Schema.Attribute.Boolean;
    }
  >;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageContentTypeSchemas {
        'plugin::content-releases.release': ReleaseSchema;
        'plugin::content-releases.release-action': ReleaseActionSchema;
      }
    }
  }
}
