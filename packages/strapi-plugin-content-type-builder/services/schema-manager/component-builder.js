'use strict';

const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');

const { convertAttributes } = require('../../utils/attributes');
const { nameToSlug, nameToCollectionName } = require('../../utils/helpers');
const createSchemaHandler = require('./schema-handler');

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const createComponentUID = ({ category, name }) =>
  `${nameToSlug(category)}.${nameToSlug(name)}`;

module.exports = function createComponentBuilder({ tmpComponents }) {
  return {
    /**
     * create a component in the tmpComponent map
     */
    createComponent(infos) {
      const uid = createComponentUID(infos);

      if (tmpComponents.has(uid)) {
        throw new Error('component.alreadyExists');
      }

      const handler = createSchemaHandler({
        dir: path.join(strapi.dir, 'components', nameToSlug(infos.category)),
        filename: `${nameToSlug(infos.name)}.json`,
      });

      const defaultConnection = _.get(
        strapi,
        ['config', 'currentEnvironment', 'database', 'defaultConnection'],
        'default'
      );

      const defaultCollectionName = `components_${nameToCollectionName(
        infos.category
      )}_${nameToCollectionName(pluralize(infos.name))}`;

      handler
        .setUID(uid)
        .set('connection', infos.connection || defaultConnection)
        .set('collectionName', infos.collectionName || defaultCollectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'icon'], infos.icon)
        .set(['info', 'description'], infos.description)
        .set('attributes', convertAttributes(infos.attributes));

      tmpComponents.set(uid, handler);

      return handler;
    },

    /**
     * create a component in the tmpComponent map
     */
    editComponent(infos) {
      const { uid } = infos;

      if (!tmpComponents.has(uid)) {
        throw new Error('component.notFound');
      }

      const handler = tmpComponents.get(uid);

      const [, nameUID] = uid.split('.');

      const newCategory = nameToSlug(infos.category);
      const newUID = `${newCategory}.${nameUID}`;

      if (newUID !== uid && tmpComponents.has(newUID)) {
        throw new Error('component.edit.alreadyExists');
      }

      const newDir = path.join(strapi.dir, 'components', newCategory);

      handler
        .setUID(newUID)
        .setDir(newDir)
        .set('connection', infos.connection)
        .set('collectionName', infos.collectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'icon'], infos.icon)
        .set(['info', 'description'], infos.description)
        .set('attributes', convertAttributes(infos.attributes));

      if (newUID !== uid) {
        this.components.forEach(compo => {
          compo.updateComponent(uid, newUID);
        });

        this.contentTypes.forEach(ct => {
          ct.updateComponent(uid, newUID);
        });
      }

      return handler;
    },

    deleteComponent(uid) {
      if (!tmpComponents.has(uid)) {
        throw new Error('component.notFound');
      }

      this.components.forEach(compo => {
        compo.removeComponent(uid);
      });

      this.contentTypes.forEach(ct => {
        ct.removeComponent(uid);
      });

      return tmpComponents.get(uid).delete();
    },
  };
};
