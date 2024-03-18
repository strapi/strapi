import { getService } from '../utils';
import { getDocumentLocaleAndStatus } from './utils/dimensions';

import {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
} from './validation';

export default {
  async generateUID(ctx: any) {
    const { contentTypeUID, field, data } = await validateGenerateUIDInput(ctx.request.body);

    const { query = {} } = ctx.request;
    const { locale } = getDocumentLocaleAndStatus(query);

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
    const { locale } = getDocumentLocaleAndStatus(query);

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
