'use strict';

const { propOr } = require('lodash/fp');

const { ValidationError } = require('@strapi/utils').errors;
const {
  hasDraftAndPublish,
  constants: { PUBLISHED_AT_ATTRIBUTE },
} = require('@strapi/utils').contentTypes;

const setPublishedAt = (data) => {
  data[PUBLISHED_AT_ATTRIBUTE] = propOr(new Date(), PUBLISHED_AT_ATTRIBUTE, data);
};

/**
 * Returns a single type service to handle default core-api actions
 */
const createSingleTypeService = ({ contentType }) => {
  const { uid } = contentType;

  /**
   * @type {import('./').SingleTypeService}
   */
  return {
    /**
     * Returns singleType content
     *
     * @return {Promise}
     */
    find(params = {}) {
      return strapi.entityService.findMany(uid, this.getFetchParams(params));
    },

    /**
     * Creates or updates a singleType content
     *
     * @return {Promise}
     */
    async createOrUpdate({ data, ...params } = {}) {
      const entity = await this.find({ ...params, publicationState: 'preview' });

      if (!entity) {
        const count = await strapi.query(uid).count();
        if (count >= 1) {
          throw new ValidationError('singleType.alreadyExists');
        }

        if (hasDraftAndPublish(contentType)) {
          setPublishedAt(data);
        }
        return strapi.entityService.create(uid, { ...params, data });
      }

      return strapi.entityService.update(uid, entity.id, { ...params, data });
    },

    /**
     * Deletes the singleType content
     *
     * @return {Promise}
     */
    async delete(params = {}) {
      const entity = await this.find(params);

      if (!entity) return;

      return strapi.entityService.delete(uid, entity.id);
    },
  };
};

module.exports = createSingleTypeService;
