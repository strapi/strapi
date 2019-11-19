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
const createContentTypeUID = ({ name }) =>
  `application::${nameToSlug(name)}.${nameToSlug(name)}`;

module.exports = function createComponentBuilder({ tmpContentTypes }) {
  return {
    /**
     * create a component in the tmpComponent map
     */
    createContentType(infos) {
      const uid = createContentTypeUID(infos);

      if (tmpContentTypes.has(uid)) {
        throw new Error('contentType.alreadyExists');
      }

      const handler = createSchemaHandler({
        dir: path.join(strapi.dir, 'api', nameToSlug(infos.name), 'models'),
        filename: `${nameToSlug(infos.name)}.json`,
      });

      const defaultConnection = _.get(
        strapi,
        ['config', 'currentEnvironment', 'database', 'defaultConnection'],
        'default'
      );

      const defaultCollectionName = `${nameToCollectionName(
        pluralize(infos.name)
      )}`;

      handler
        .setUID(uid)
        .set('connection', infos.connection || defaultConnection)
        .set('collectionName', infos.collectionName || defaultCollectionName)
        .set(['info', 'name'], infos.name)
        .set(['info', 'description'], infos.description)
        .set('attributes', convertAttributes(infos.attributes));

      tmpContentTypes.set(uid, handler);

      return handler;
    },
  };
};
