import { propOr } from 'lodash/fp';
import type { CoreApi, Schema, Common } from '@strapi/types';
import { errors, contentTypes as contentTypeUtils } from '@strapi/utils';
import { getFetchParams } from './get-fetch-params';

const {
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
        strapi.documents.findMany(uid as Common.UID.SingleType, this.getFetchParams(params)) ?? null
      );
    },

    /**
     * Creates or updates a singleType content
     *
     * @return {Promise}
     */
    async createOrUpdate({ data, ...params } = { data: {} }) {
      const document = await this.find({ ...params, publicationState: 'preview' });

      // TODO: v5 - manage multiple draft & published versions the count will not work as simple as this
      if (!document) {
        const count = await strapi.query(uid).count();
        if (count >= 1) {
          throw new errors.ValidationError('singleType.alreadyExists');
        }

        setPublishedAt(data);

        return strapi.documents.create(uid, { ...params, data });
      }

      return strapi.documents.update(uid, document.documentId, { ...params, data });
    },

    /**
     * Deletes the singleType content
     *
     * @return {Promise}
     */
    async delete(params = {}) {
      const document = await this.find(params);

      if (!document) return;

      return strapi.documents.delete(uid, document.documentId);
    },
  };
};

export default createSingleTypeService;
