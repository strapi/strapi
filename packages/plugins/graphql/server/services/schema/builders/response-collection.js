'use strict';

const { objectType, nonNull } = require('nexus');
const { defaultTo, prop, pipe } = require('lodash/fp');

const { utils, constants } = require('../../types');

module.exports = () => ({
  /**
   * Build a type definition for a content API collection response for a given content type
   * @param {object} contentType The content type which will be used to build its content API response definition
   * @return {NexusObjectTypeDef}
   */
  buildResponseCollectionDefinition: contentType => {
    const name = utils.getEntityResponseCollectionName(contentType);
    const entityName = utils.getEntityName(contentType);

    return objectType({
      name,

      definition(t) {
        t.nonNull.list.field('data', {
          type: nonNull(entityName),

          resolve: pipe(prop('nodes'), defaultTo([])),
        });

        t.nonNull.field('meta', {
          type: constants.RESPONSE_COLLECTION_META_TYPE_NAME,
          // Pass down the args stored in the source object
          resolve: prop('info'),
        });
      },
    });
  },
});
