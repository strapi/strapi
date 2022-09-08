'use strict';

const { join } = require('path');
const _ = require('lodash');
const { ApplicationError } = require('@strapi/utils').errors;

const createSchemaHandler = require('./schema-handler');
const createComponentBuilder = require('./component-builder');
const createContentTypeBuilder = require('./content-type-builder');

/**
 * Creates a content type schema builder instance
 *
 * @returns {object} content type schema builder
 */
module.exports = function createBuilder() {
  const components = Object.keys(strapi.components).map((key) => {
    const compo = strapi.components[key];

    return {
      category: compo.category,
      modelName: compo.modelName,
      plugin: compo.modelName,
      uid: compo.uid,
      filename: compo.__filename__,
      dir: join(strapi.dirs.app.components, compo.category),
      schema: compo.__schema__,
      config: compo.config,
    };
  });

  const contentTypes = Object.keys(strapi.contentTypes).map((key) => {
    const contentType = strapi.contentTypes[key];

    const dir = contentType.plugin
      ? join(
          strapi.dirs.app.extensions,
          contentType.plugin,
          'content-types',
          contentType.info.singularName
        )
      : join(
          strapi.dirs.app.api,
          contentType.apiName,
          'content-types',
          contentType.info.singularName
        );

    return {
      modelName: contentType.modelName,
      plugin: contentType.plugin,
      uid: contentType.uid,
      filename: 'schema.json',
      dir,
      schema: contentType.__schema__,
      config: contentType.config,
    };
  });

  return createSchemaBuilder({
    components,
    contentTypes,
  });
};

/**
 * Schema builder
 *
 * @param {object} opts options
 * @param {object} opts.contentTypes contentTypes
 * @returns {object} schema builder
 */
function createSchemaBuilder({ components, contentTypes }) {
  const tmpComponents = new Map();
  const tmpContentTypes = new Map();

  // init temporary ContentTypes
  Object.keys(contentTypes).forEach((key) => {
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
            throw new ApplicationError(`target: ${target} does not exist`);
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

          throw new ApplicationError('Invalid schema edition');
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
