'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const bookshelf = require('bookshelf');

module.exports = {
  async editMany(params, data) {
    const Bookshelf = new bookshelf(strapi.connections.default);
    // abstract transactional batch update
    function batchUpdate(table, collection) {
      return Bookshelf.knex.transaction(trx => {
        const queries = collection.map(tuple =>
          Bookshelf.knex(table)
            .where('id', tuple.id)
            .update(tuple)
            .transacting(trx)
        );
        return Promise.all(queries)
          .then(trx.commit)
          .catch(trx.rollback);
      });
    }
    return await batchUpdate('pages', data);
  },
};
