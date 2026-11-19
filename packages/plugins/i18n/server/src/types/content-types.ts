import type { Schema, Struct } from '@strapi/types';

/**
 * The schema of `plugin::i18n.locale` once loaded (`../content-types/locale/schema.json`), as type
 * generation writes it for an application that does not extend it. `schema.json` puts its
 * `collectionName` in `info`, so the plugin loader names the collection `i18n_locale`
 * (`packages/core/core/src/loaders/plugins/index.ts`). Named `LocaleSchema` because `Locale` is the
 * row type of the i18n services.
 */
export interface LocaleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
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
    'plugin::i18n.locale',
    {
      name: Schema.Attribute.String & Schema.Attribute.SetMinMax<{ min: 1; max: 50 }, number>;
      code: Schema.Attribute.String & Schema.Attribute.Unique;
    }
  >;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageContentTypeSchemas {
        'plugin::i18n.locale': LocaleSchema;
      }
    }
  }
}
