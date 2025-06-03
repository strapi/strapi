import type { UID } from '@strapi/types';
import { getService } from '../utils';
import { getDocumentLocaleAndStatus } from './validation/dimensions';

import {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
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
    const { contentTypeUID, field, value } = await validateCheckUIDAvailabilityInput(
      ctx.request.body
    );

    const { query = {} } = ctx.request;
    const { locale } = await getDocumentLocaleAndStatus(query, contentTypeUID as UID.Schema);

    await validateUIDField(contentTypeUID, field);

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
  },
};
