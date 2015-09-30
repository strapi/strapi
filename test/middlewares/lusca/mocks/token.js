'use strict';

const tokenModule = module.exports = {
  value: 'tokenAllTheThings',

  create: function (ctx) {
    ctx.session._token = 'mock token';
    return tokenModule.value;
  },

  validate: function (ctx, token) {
    return token === tokenModule.value;
  }
};
