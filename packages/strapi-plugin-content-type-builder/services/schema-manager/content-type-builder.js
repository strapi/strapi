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

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const createContentTypeUID = ({ name }) =>
  `application::${nameToSlug(name)}.${nameToSlug(name)}`;

module.exports = function createComponentBuilder() {
  return {
    /**
     * create a component in the tmpComponent map
     */
    createContentType(infos) {
      const uid = createContentTypeUID(infos);

      if (this.contentTypes.has(uid)) {
        throw new Error('contentType.alreadyExists');
      }

      const contentType = createSchemaHandler({
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
        const attr = infos.attributes[key];

        if (_.has(attr, 'target')) {
          if (!this.contentTypes.has(attr.target)) {
            throw new Error('target.contentType.notFound');
          }

          const targetContentType = this.contentTypes.get(attr.target);

          if (
            _.has(targetContentType.schema.attributes, attr.targetAttribute)
          ) {
            throw new Error('target.attribute.alreadyExists');
          }

          const opts = {
            via: key,
            columnName: attr.targetColumnName,
          };

          switch (attr.nature) {
            case 'manyWay':
            case 'oneWay':
              return;
            case 'oneToOne':
            case 'oneToMany':
              opts.model = contentType.modelName;
              break;
            case 'manyToOne':
              opts.collection = contentType.modelName;
              break;
            case 'manyToMany': {
              opts.collection = contentType.modelName;

              if (!attr.dominant) {
                opts.dominant = true;
              }
              break;
            }
            default:
          }

          targetContentType.set(['attributes', attr.targetAttribute], opts);
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

      const newAttributes = convertAttributes(infos.attributes);

      // TODO: clear changed or deleted relations
      Object.keys(contentType.schema.attributes)
        .filter(key => {
          const attr = contentType.schema.attributes[key];

          // ignore non relational attributes and unidirectionnal attributes
          if (!isRelation(attr) || !_.has(attr, 'via')) return false;

          console.log(key);

          const target = attr.model || attr.collection;
          const plugin = attr.plugin;

          // key isn't present anymore
          if (!_.has(newAttributes, key)) return true;

          const newAttr = newAttributes[key];
          // if the new attribute isn't a relation;
          if (!isRelation(newAttr)) return true;

          const newTarget = newAttr.model || newAttr.collection;

          // if target attribute isn't the same as before
          if (attr.via !== newAttr.via) return true;

          // if the target content type isn't the same
          if (target !== newTarget || plugin !== attr.plugin) return true;
        })
        .forEach(key => {
          const attr = contentType.schema.attributes[key];
          const target = attr.model || attr.collection;
          const plugin = attr.plugin;

          const uid = toUID(target, plugin);

          this.contentTypes.get(uid).unset(['attributes', attr.via]);
        });

      // TODO: build new reversed relations

      contentType
        .set('connection', infos.connection)
        .set('collectionName', infos.collectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'description'], infos.description)
        .set('attributes', newAttributes);

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
