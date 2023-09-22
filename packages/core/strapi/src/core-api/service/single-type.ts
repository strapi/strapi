import { propOr } from 'lodash/fp';
import type { CoreApi, Schema, Common } from '@strapi/types';
import { errors, contentTypes as contentTypeUtils } from '@strapi/utils';
import { getFetchParams } from './get-fetch-params';

const {
  hasDraftAndPublish,
  constants: { PUBLISHED_AT_ATTRIBUTE },
} = contentTypeUtils;

const setPublishedAt = (data: Record<string, unknown>) => {
  data[PUBLISHED_AT_ATTRIBUTE] = propOr(new Date(), PUBLISHED_AT_ATTRIBUTE, data);
};

/**
 * Returns a single type service to handle default core-api actions
 */
const createSingleTypeService = ({
  contentType,
}: {
  contentType: Schema.SingleType;
}): CoreApi.Service.SingleType => {
  const { uid } = contentType;

  return <any>{
    getFetchParams,
    /**
     * Returns singleType content
     */
    find(params = {}) {
      return (
        strapi.entityService?.findMany(uid as Common.UID.SingleType, this.getFetchParams(params)) ??
        null
      );
    },

    /**
     * Creates or updates a singleType content
     *
     * @return {Promise}
     */
    async createOrUpdate({ data, ...params } = { data: {} }) {
      const entity = await this.find({ ...params, publicationState: 'preview' });

      if (!entity) {
        const count = await strapi.query(uid).count();
        if (count >= 1) {
          throw new errors.ValidationError('singleType.alreadyExists');
        }

        if (hasDraftAndPublish(contentType)) {
          setPublishedAt(data);
        }
        return strapi.entityService?.create(uid, { ...params, data });
      }

      return strapi.entityService?.update(uid, entity.id, { ...params, data });
    },

    /**
     * Deletes the singleType content
     *
     * @return {Promise}
     */
    async delete(params = {}) {
      const entity = await this.find(params);

      if (!entity) return;

      return strapi.entityService?.delete(uid, entity.id);
    },
  };
};

export default createSingleTypeService;
