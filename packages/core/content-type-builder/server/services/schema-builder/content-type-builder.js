'use strict';

const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');

const { nameToSlug, nameToCollectionName } = require('@strapi/utils');
const { isRelation, isConfigurable } = require('../../utils/attributes');
const { typeKinds } = require('../constants');
const createSchemaHandler = require('./schema-handler');

const reuseUnsetPreviousProperties = (newAttribute, oldAttribute) => {
  _.defaults(
    newAttribute,
    _.omit(oldAttribute, [
      'configurable',
      'required',
      'private',
      'unique',
      'pluginOptions',
      'inversedBy',
      'mappedBy',
    ])
  );
};

module.exports = function createComponentBuilder() {
  return {
    setRelation({ key, uid, attribute }) {
      if (!_.has(attribute, 'target')) {
        return;
      }

      const targetCT = this.contentTypes.get(attribute.target);
      const targetAttribute = targetCT.getAttribute(attribute.targetAttribute);

      if (!attribute.targetAttribute) {
        return;
      }

      targetCT.setAttribute(
        attribute.targetAttribute,
        generateRelation({
          key,
          attribute,
          uid,
          targetAttribute,
        })
      );
    },

    unsetRelation(attribute) {
      if (!_.has(attribute, 'target')) {
        return;
      }

      const targetCT = this.contentTypes.get(attribute.target);

      const targetAttributeName = attribute.inversedBy || attribute.mappedBy;
      const targetAttribute = targetCT.getAttribute(targetAttributeName);

      if (!targetAttribute) return;

      return targetCT.deleteAttribute(targetAttributeName);
    },

    /**
     * Creates a content type in memory to be written to files later on
     *
     * @param {object} infos content type info
     * @returns {object} new content type
     */
    createContentType(infos) {
      const uid = createContentTypeUID(infos);

      if (this.contentTypes.has(uid)) {
        throw new Error('contentType.alreadyExists');
      }

      const modelName = pluralize.singular(nameToSlug(infos.name));
      const contentType = createSchemaHandler({
        modelName,
        dir: path.join(strapi.dirs.api, modelName, 'content-types', modelName),
        filename: `schema.json`,
      });

      this.contentTypes.set(uid, contentType);

      const defaultCollectionName = `${nameToCollectionName(pluralize(infos.name))}`;

      // support self referencing content type relation
      Object.keys(infos.attributes).forEach(key => {
        const { target } = infos.attributes[key];
        if (target === '__self__') {
          infos.attributes[key].target = uid;
        }
      });

      contentType
        .setUID(uid)
        .set('kind', infos.kind || typeKinds.COLLECTION_TYPE)
        .set('collectionName', infos.collectionName || defaultCollectionName)
        .set('info', {
          singularName: modelName,
          pluralName: pluralize(modelName),
          displayName: infos.name,
          // TODO: remove name eventually
          name: infos.name,
          description: infos.description,
        })
        .set('options', {
          draftAndPublish: infos.draftAndPublish || false,
        })
        .set('pluginOptions', infos.pluginOptions)
        .setAttributes(this.convertAttributes(infos.attributes));

      Object.keys(infos.attributes).forEach(key => {
        const attribute = infos.attributes[key];

        if (isRelation(attribute)) {
          this.setRelation({
            key,
            uid,
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

      const newAttributes = _.omitBy(infos.attributes, (attr, key) => {
        return _.has(oldAttributes, key) && !isConfigurable(oldAttributes[key]);
      });

      const newKeys = _.difference(Object.keys(newAttributes), Object.keys(oldAttributes));
      const deletedKeys = _.difference(Object.keys(oldAttributes), Object.keys(newAttributes));
      const remainingKeys = _.intersection(Object.keys(oldAttributes), Object.keys(newAttributes));

      // remove old relations
      deletedKeys.forEach(key => {
        const attribute = oldAttributes[key];

        const targetAttributeName = attribute.inversedBy || attribute.mappedBy;

        // if the old relation has a target attribute. we need to remove it in the target type
        if (isConfigurable(attribute) && isRelation(attribute) && !_.isNil(targetAttributeName)) {
          this.unsetRelation(attribute);
        }
      });

      remainingKeys.forEach(key => {
        const oldAttribute = oldAttributes[key];
        const newAttribute = newAttributes[key];

        if (!isRelation(oldAttribute) && isRelation(newAttribute)) {
          return this.setRelation({
            key,
            uid,
            attribute: newAttributes[key],
          });
        }

        if (isRelation(oldAttribute) && !isRelation(newAttribute)) {
          return this.unsetRelation(oldAttribute);
        }

        if (isRelation(oldAttribute) && isRelation(newAttribute)) {
          const oldTargetAttributeName = oldAttribute.inversedBy || oldAttribute.mappedBy;

          const sameRelation = oldAttribute.relation === newAttribute.relation;
          const targetAttributeHasChanged = oldTargetAttributeName !== newAttribute.targetAttribute;

          if (!sameRelation || targetAttributeHasChanged) {
            this.unsetRelation(oldAttribute);
          }

          // keep extra options that were set manually on oldAttribute
          reuseUnsetPreviousProperties(newAttribute, oldAttribute);

          if (oldAttribute.inversedBy) {
            newAttribute.dominant = true;
          } else if (oldAttribute.mappedBy) {
            newAttribute.dominant = false;
          }

          return this.setRelation({
            key,
            uid,
            attribute: newAttribute,
          });
        }
      });

      // add new relations
      newKeys.forEach(key => {
        const attribute = newAttributes[key];

        if (isRelation(attribute)) {
          this.setRelation({
            key,
            uid,
            attribute,
          });
        }
      });

      contentType
        .set('collectionName', infos.collectionName)
        .set('kind', infos.kind || contentType.schema.kind)
        .set(['info', 'name'], infos.name)
        .set(['info', 'description'], infos.description)
        .set(['options', 'draftAndPublish'], infos.draftAndPublish || false)
        .set('pluginOptions', infos.pluginOptions)
        .setAttributes(this.convertAttributes(newAttributes));

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

      return this.contentTypes.get(uid).delete();
    },
  };
};

/**
 * Returns a uid from a content type infos
 *
 * @param {object} options options
 * @param {string} options.name component name
 * @returns {string} uid
 */
const createContentTypeUID = ({ name }) => `api::${nameToSlug(name)}.${nameToSlug(name)}`;

const generateRelation = ({ key, attribute, uid, targetAttribute = {} }) => {
  const opts = {
    type: 'relation',
    target: uid,
    autoPopulate: targetAttribute.autoPopulate,
    private: targetAttribute.private || undefined,
  };

  switch (attribute.relation) {
    case 'oneToOne': {
      opts.relation = 'oneToOne';

      if (attribute.dominant) {
        opts.mappedBy = key;
      } else {
        opts.inversedBy = key;
      }
      break;
    }
    case 'oneToMany': {
      opts.relation = 'manyToOne';
      opts.inversedBy = key;
      break;
    }
    case 'manyToOne': {
      opts.relation = 'oneToMany';
      opts.mappedBy = key;
      break;
    }
    case 'manyToMany': {
      opts.relation = 'manyToMany';

      if (attribute.dominant) {
        opts.mappedBy = key;
      } else {
        opts.inversedBy = key;
      }

      break;
    }
    default:
  }

  // we do this just to make sure we have the same key order when writing to files
  const { type, relation, target, ...restOptions } = opts;

  return {
    type,
    relation,
    target,
    ...restOptions,
  };
};
