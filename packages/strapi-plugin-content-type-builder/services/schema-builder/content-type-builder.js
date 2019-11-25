'use strict';

const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');

const {
  convertAttributes,
  isRelation,
  toUID,
} = require('../../utils/attributes');
const { nameToSlug, nameToCollectionName } = require('../../utils/helpers');
const createSchemaHandler = require('./schema-handler');

module.exports = function createComponentBuilder() {
  return {
    setRelation({ key, modelName, attribute }) {
      this.contentTypes.get(attribute.target).set(
        ['attributes', attribute.targetAttribute],
        generateRelation({
          key,
          attribute,
          modelName,
        })
      );
    },

    unsetRelation(attribute) {
      const target = attribute.model || attribute.collection;
      const plugin = attribute.plugin;

      const uid = toUID(target, plugin);

      return this.contentTypes.get(uid).unset(['attributes', attribute.via]);
    },

    /**
     * create a component in the tmpComponent map
     */
    createContentType(infos) {
      const uid = createContentTypeUID(infos);

      if (this.contentTypes.has(uid)) {
        throw new Error('contentType.alreadyExists');
      }

      const contentType = createSchemaHandler({
        modelName: nameToSlug(infos.name),
        dir: path.join(strapi.dir, 'api', nameToSlug(infos.name), 'models'),
        filename: `${nameToSlug(infos.name)}.settings.json`,
      });

      const defaultConnection = _.get(
        strapi,
        ['config', 'currentEnvironment', 'database', 'defaultConnection'],
        'default'
      );

      const defaultCollectionName = `${nameToCollectionName(
        pluralize(infos.name)
      )}`;

      contentType
        .setUID(uid)
        .set('connection', infos.connection || defaultConnection)
        .set('collectionName', infos.collectionName || defaultCollectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'description'], infos.description)
        .set('attributes', convertAttributes(infos.attributes));

      this.contentTypes.set(uid, contentType);

      Object.keys(infos.attributes).forEach(key => {
        const attribute = infos.attributes[key];

        if (isRelation(attribute)) {
          this.setRelation({
            key,
            modelName: contentType.modelName,
            attribute,
          });
        }
      });

      return contentType;
    },

    editContentType(infos) {
      const { uid } = infos;

      if (!this.contentTypes.has(uid)) {
        throw new Error('contentType.notFound');
      }

      const contentType = this.contentTypes.get(uid);

      const oldAttributes = contentType.schema.attributes;

      const newKeys = _.difference(
        Object.keys(infos.attributes),
        Object.keys(oldAttributes)
      );

      const deletedKeys = _.difference(
        Object.keys(oldAttributes),
        Object.keys(infos.attributes)
      );

      const remainingKeys = _.intersection(
        Object.keys(oldAttributes),
        Object.keys(infos.attributes)
      );

      // remove old relations
      deletedKeys.forEach(key => {
        const attribute = oldAttributes[key];

        if (isRelation(attribute) && _.has(attribute, 'via')) {
          this.unsetRelation(attribute);
        }
      });

      remainingKeys.forEach(key => {
        const oldAttribute = oldAttributes[key];
        const newAttribute = infos.attributes[key];

        if (!isRelation(oldAttribute) && isRelation(newAttribute)) {
          return this.setRelation({
            key,
            modelName: contentType.modelName,
            attribute: infos.attributes[key],
          });
        }

        if (isRelation(oldAttribute) && !isRelation(newAttribute)) {
          return this.unsetRelation(oldAttribute);
        }

        if (isRelation(oldAttribute) && isRelation(newAttribute)) {
          if (oldAttribute.via !== newAttribute.targetAttribute) {
            this.unsetRelation(oldAttribute);
          }

          return this.setRelation({
            key,
            modelName: contentType.modelName,
            attribute: newAttribute,
          });
        }
      });

      // add new relations
      newKeys.forEach(key => {
        const attribute = infos.attributes[key];

        if (isRelation(attribute)) {
          this.setRelation({
            key,
            modelName: contentType.modelName,
            attribute,
          });
        }
      });

      contentType
        .set('connection', infos.connection)
        .set('collectionName', infos.collectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'description'], infos.description)
        .set('attributes', convertAttributes(infos.attributes));

      return contentType;
    },

    deleteContentType(uid) {
      if (!this.contentTypes.has(uid)) {
        throw new Error('contentType.notFound');
      }

      this.components.forEach(compo => {
        compo.removeContentType(uid);
      });

      this.contentTypes.forEach(ct => {
        ct.removeContentType(uid);
      });

      // TODO: clear api when a contentType is deleted
      return this.contentTypes.get(uid).delete();
    },
  };
};

/**
 * Returns a uid from a content type infos
 * @param {Object} options options
 * @param {string} options.name component name
 */
const createContentTypeUID = ({ name }) =>
  `application::${nameToSlug(name)}.${nameToSlug(name)}`;

const generateRelation = ({ key, attribute, modelName }) => {
  const opts = {
    via: key,
    columnName: attribute.targetColumnName,
  };

  switch (attribute.nature) {
    case 'manyWay':
    case 'oneWay':
      return;
    case 'oneToOne':
    case 'oneToMany':
      opts.model = modelName;
      break;
    case 'manyToOne':
      opts.collection = modelName;
      break;
    case 'manyToMany': {
      opts.collection = modelName;

      if (!attribute.dominant) {
        opts.dominant = true;
      }
      break;
    }
    default:
  }

  return opts;
};
