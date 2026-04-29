import type { UID } from '@strapi/types';
import _ from 'lodash';
import { getService } from '../utils';
import { getDocumentLocaleAndStatus } from './validation/dimensions';

import {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
  validateUIDFieldOrUniqueIndex,
} from './validation';

export default {
  async generateUID(ctx: any) {
    const { contentTypeUID, field, data } = await validateGenerateUIDInput(ctx.request.body);

    const { query = {} } = ctx.request;
    const { locale } = await getDocumentLocaleAndStatus(query, contentTypeUID as UID.Schema);

    await validateUIDField(contentTypeUID, field);

    const uidService = getService('uid');

    ctx.body = {
      data: await uidService.generateUIDField({ contentTypeUID, field, data, locale }),
    };
  },

  async checkUIDAvailability(ctx: any) {
    const { contentTypeUID, field, value, documentId } = await validateCheckUIDAvailabilityInput(
      ctx.request.body
    );

    const { query = {} } = ctx.request;
    const { locale } = await getDocumentLocaleAndStatus(query, contentTypeUID as UID.Schema);

    await validateUIDFieldOrUniqueIndex(contentTypeUID, field);

    const contentType = strapi.contentType(contentTypeUID as UID.ContentType);
    const isUIDField = _.get(contentType, ['attributes', field, 'type']) === 'uid';

    if (isUIDField) {
      const uidService = getService('uid');
      const isAvailable = await uidService.checkUIDAvailability({
        contentTypeUID,
        field,
        value,
        locale,
      });
      ctx.body = {
        isAvailable,
        suggestion: !isAvailable
          ? await uidService.findUniqueUID({ contentTypeUID, field, value, locale })
          : null,
      };
    } else {
      const isAvailable = await strapi.documents.checkUniqueAttributeAvailability(
        contentTypeUID as UID.ContentType,
        field,
        value,
        { documentId, locale }
      );
      ctx.body = { isAvailable, suggestion: null };
    }
  },
};
