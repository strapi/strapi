'use strict';

const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');

const { convertAttributes } = require('../../utils/attributes');
const { nameToSlug, nameToCollectionName } = require('../../utils/helpers');
const createSchemaHandler = require('./schema-handler');

module.exports = function createComponentBuilder() {
  return {
    /**
     * Returns a uid from a string
     * @param {string} str - string to slugify
     */
    createComponentUID({ category, name }) {
      return `${nameToSlug(category)}.${nameToSlug(name)}`;
    },

    createNewComponentUIDMap(components) {
      return components.reduce((uidMap, component) => {
        uidMap[component.tmpUID] = this.createComponentUID(component);
        return uidMap;
      }, {});
    },

    /**
     * create a component in the tmpComponent map
     */
    createComponent(infos) {
      const uid = this.createComponentUID(infos);

      if (this.components.has(uid)) {
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

      this.components.set(uid, handler);

      return handler;
    },

    /**
     * create a component in the tmpComponent map
     */
    editComponent(infos) {
      const { uid } = infos;

      if (!this.components.has(uid)) {
        throw new Error('component.notFound');
      }

      const handler = this.components.get(uid);

      const [, nameUID] = uid.split('.');

      const newCategory = nameToSlug(infos.category);
      const newUID = `${newCategory}.${nameUID}`;

      if (newUID !== uid && this.components.has(newUID)) {
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
        // TODO: keep configurable args etc...
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
      if (!this.components.has(uid)) {
        throw new Error('component.notFound');
      }

      this.components.forEach(compo => {
        compo.removeComponent(uid);
      });

      this.contentTypes.forEach(ct => {
        ct.removeComponent(uid);
      });

      return this.components.get(uid).delete();
    },
  };
};
