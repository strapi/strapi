import { join } from 'path';
import _ from 'lodash';

import { errors } from '@strapi/utils';
import type { Schema, Utils } from '@strapi/types';
import createSchemaHandler from './schema-handler';
import createComponentBuilder from './component-builder';
import createContentTypeBuilder from './content-type-builder';

export interface ComponentInput extends Schema.Component {
  __filename__: string;
  __schema__: Schema.Schema;
  config: object;
}

export interface Component extends Pick<Schema.Component, 'modelName' | 'uid'> {
  category: string;
  plugin: string;
  filename: string;
  dir: string;
  schema: Schema.Schema;
  config: object;
}

export interface ContentTypeInput extends Schema.ContentType {
  __schema__: Schema.Schema;
  plugin: string;
  apiName: string;
  config: object;
  dir: string;
}

export interface ContentType extends Pick<Schema.ContentType, 'modelName' | 'uid'> {
  filename: string;
  dir: string;
  schema: Schema.Schema;
  plugin: string;
  config: object;
}

/**
 * Creates a content type schema builder instance
 *
 * @returns {object} content type schema builder
 */
export default function createBuilder() {
  const components = Object.keys(strapi.components).map((key) => {
    const componentInput = strapi.components[
      key as keyof typeof strapi.components
    ] as ComponentInput;
    const component: Component = {
      category: componentInput.category,
      modelName: componentInput.modelName,
      plugin: componentInput.modelName,
      uid: componentInput.uid,
      filename: componentInput.__filename__,
      dir: join(strapi.dirs.app.components, componentInput.category),
      schema: componentInput.__schema__,
      config: componentInput.config,
    };
    return component;
  });

  const contentTypes = Object.keys(strapi.contentTypes).map((key) => {
    const contentTypeInput = strapi.contentTypes[
      key as keyof typeof strapi.contentTypes
    ] as ContentTypeInput;

    const dir = contentTypeInput.plugin
      ? join(
          strapi.dirs.app.extensions,
          contentTypeInput.plugin,
          'content-types',
          contentTypeInput.info.singularName
        )
      : join(
          strapi.dirs.app.api,
          contentTypeInput.apiName,
          'content-types',
          contentTypeInput.info.singularName
        );

    const contentType: ContentType = {
      modelName: contentTypeInput.modelName,
      plugin: contentTypeInput.plugin,
      uid: contentTypeInput.uid,
      filename: 'schema.json',
      dir,
      schema: contentTypeInput.__schema__,
      config: contentTypeInput.config,
    };

    return contentType;
  });

  return createSchemaBuilder({
    components,
    contentTypes,
  });
}

type SchemaBuilderOptions = {
  components: Utils.String.Dict<Component>;
  contentTypes: Utils.String.Dict<ContentType>;
};

function createSchemaBuilder({ components, contentTypes }: SchemaBuilderOptions) {
  const tmpComponents = new Map();
  const tmpContentTypes = new Map();

  // init temporary ContentTypes
  Object.keys(contentTypes).forEach((key) => {
    tmpContentTypes.set(contentTypes[key].uid, createSchemaHandler(contentTypes[key]));
  });
  Object.keys(contentTypes).forEach((key: string) => {
    tmpContentTypes.set(contentTypes[key].uid, createSchemaHandler(contentTypes[key]));
  });

  // init temporary components
  Object.keys(components).forEach((key) => {
    tmpComponents.set(components[key].uid, createSchemaHandler(components[key]));
  });

  return {
    get components() {
      return tmpComponents;
    },
    get contentTypes() {
      return tmpContentTypes;
    },

    /**
     * Convert Attributes received from the API to the right syntaxt
     *
     * @param {object} attributes input attributes
     * @returns {object} transformed attributes
     */
    convertAttributes(attributes) {
      return Object.keys(attributes).reduce((acc, key) => {
        const attribute = attributes[key];

        const { configurable, private: isPrivate } = attribute;

        const baseProperties = {
          private: isPrivate === true ? true : undefined,
          configurable: configurable === false ? false : undefined,
        };

        if (attribute.type === 'relation') {
          const { target, relation, targetAttribute, dominant, ...restOfProperties } = attribute;

          const attr = {
            type: 'relation',
            relation,
            target,
            ...restOfProperties,
            ...baseProperties,
          };

          acc[key] = attr;

          if (target && !this.contentTypes.has(target)) {
            throw new errors.ApplicationError(`target: ${target} does not exist`);
          }

          if (_.isNil(targetAttribute)) {
            return acc;
          }

          if (['oneToOne', 'manyToMany'].includes(relation) && dominant === true) {
            attr.inversedBy = targetAttribute;
          } else if (['oneToOne', 'manyToMany'].includes(relation) && dominant === false) {
            attr.mappedBy = targetAttribute;
          } else if (['oneToOne', 'manyToOne', 'manyToMany'].includes(relation)) {
            attr.inversedBy = targetAttribute;
          } else if (['oneToMany'].includes(relation)) {
            attr.mappedBy = targetAttribute;
          }

          return acc;
        }

        acc[key] = {
          ...attribute,
          ...baseProperties,
        };

        return acc;
      }, {});
    },

    ...createComponentBuilder({ tmpComponents, tmpContentTypes }),
    ...createContentTypeBuilder({ tmpComponents, tmpContentTypes }),

    /**
     * Write all type to files
     *
     * @returns {void}
     */
    writeFiles() {
      const schemas = [
        ...Array.from(tmpComponents.values()),
        ...Array.from(tmpContentTypes.values()),
      ];

      return Promise.all(schemas.map((schema) => schema.flush()))
        .catch((error) => {
          strapi.log.error('Error writing schema files');
          strapi.log.error(error);
          return this.rollback();
        })
        .catch((error) => {
          strapi.log.error(
            'Error rolling back schema files. You might need to fix your files manually'
          );
          strapi.log.error(error);

          throw new errors.ApplicationError('Invalid schema edition');
        });
    },

    /**
     * rollback all files
     *
     * @returns {void}
     */
    rollback() {
      return Promise.all(
        [...Array.from(tmpComponents.values()), ...Array.from(tmpContentTypes.values())].map(
          (schema) => schema.rollback()
        )
      );
    },
  };
}
