import { getService } from '../utils';
import {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
} from './validation';

export default {
  async generateUID(ctx: any) {
    const { contentTypeUID, field, data, locale } = await validateGenerateUIDInput(
      ctx.request.body
    );

    await validateUIDField(contentTypeUID, field);

    const uidService = getService('uid');

    ctx.body = {
      data: await uidService.generateUIDField({ contentTypeUID, field, data, locale }),
    };
  },

  async checkUIDAvailability(ctx: any) {
    const { contentTypeUID, field, value, locale } = await validateCheckUIDAvailabilityInput(
      ctx.request.body
    );

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
