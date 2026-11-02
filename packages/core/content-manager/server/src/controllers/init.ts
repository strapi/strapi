import { getService } from '../utils';

export default {
  async getInitData(ctx: any) {
    const { toDto } = getService('data-mapper');
    const { findAllComponents } = getService('components');
    const { getAllFieldSizes } = getService('field-sizes');
    const { findAllContentTypes } = getService('content-types');
    const { getContentStructure } = getService('content-structure');

    const contentStructure = await getContentStructure();

    ctx.body = {
      data: {
        fieldSizes: getAllFieldSizes(),
        components: findAllComponents().map(toDto),
        contentTypes: findAllContentTypes().map(toDto),
        ...(contentStructure ? { contentStructure } : {}),
      },
    };
  },
};
