'use strict';

const { objectType } = require('nexus');
const { prop } = require('lodash/fp');

const { utils } = require('../../types');

module.exports = () => ({
  /**
   * Build a type definition for a content API response for a given content type
   * @param {object} contentType The content type which will be used to build its content API response definition
   * @return {NexusObjectTypeDef}
   */
  buildResponseDefinition: contentType => {
    const name = utils.getEntityResponseName(contentType);
    const entityName = utils.getEntityName(contentType);

    return objectType({
      name,

      definition(t) {
        t.field('data', {
          type: entityName,

          resolve: prop('value'),
        });
      },
    });
  },
});
