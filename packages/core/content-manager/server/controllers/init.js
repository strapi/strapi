'use strict';

const { getService } = require('../utils');

module.exports = {
  getInitData(ctx) {
    const { toDto } = getService('data-mapper');
    const { findAllComponents } = getService('components');
    const { getAllFieldSizes } = getService('field-sizes');
    const { findAllContentTypes } = getService('content-types');

    ctx.body = {
      data: {
        fieldSizes: getAllFieldSizes(),
        components: findAllComponents().map(toDto),
        contentTypes: findAllContentTypes().map(toDto),
      },
    };
  },
};
