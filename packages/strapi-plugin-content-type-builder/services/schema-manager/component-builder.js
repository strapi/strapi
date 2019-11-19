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

      handler.uid = uid;
      handler
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

      // TODO: handle category change to move the file

      handler
        .set('connection', infos.connection)
        .set('collectionName', infos.collectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'icon'], infos.icon)
        .set(['info', 'description'], infos.description)
        .set('attributes', convertAttributes(infos.attributes));

      // TODO: update relations if uid changed
      // TODO: update relations if uid changed

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
