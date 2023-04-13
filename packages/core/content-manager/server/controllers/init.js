'use strict';

const { getService } = require('../utils');

module.exports = {
  getInitData(ctx) {
    ctx.body = {
      data: {
        fieldSizes: getService('field-sizes').getFieldSizes(),
      },
    };
  },
};
