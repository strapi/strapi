'use strict';

const parseMultipartData = require('./utils/parse-multipart');

/**
 * default bookshelf controller
 *
 */
module.exports = ({ service }) => {
  return {
    /**
     * expose some utils so the end users can use them
     */
    parseMultipartData,

    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */

    find(ctx) {
      if (ctx.query._q) {
        return service.search(ctx.query);
      }
      return service.find(ctx.query);
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */

    findOne(ctx) {
      return service.findOne(ctx.params);
    },

    /**
     * Count records.
     *
     * @return {Number}
     */

    count(ctx) {
      if (ctx.query._q) {
        return service.countSearch(ctx.query);
      }
      return service.count(ctx.query);
    },

    /**
     * Create a record.
     *
     * @return {Object}
     */

    create(ctx) {
      if (ctx.is('multipart')) {
        const { data, files } = this.parseMultipartData(ctx);
        return service.create(data, { files });
      }

      return service.create(ctx.request.body);
    },

    /**
     * Update a record.
     *
     * @return {Object}
     */

    update(ctx) {
      if (ctx.is('multipart')) {
        const { data, files } = this.parseMultipartData(ctx);
        return service.update(ctx.params, data, { files });
      }

      return service.update(ctx.params, ctx.request.body);
    },

    /**
     * Destroy a record.
     *
     * @return {Object}
     */

    delete(ctx) {
      return service.delete(ctx.params);
    },
  };
};
