'use strict';

const { FileTooLargeError, FileNotFoundError } = require('../../errors');

module.exports = () => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (e) {
      if (e instanceof FileTooLargeError) return ctx.PayloadTooLarge();
      if (e instanceof FileNotFoundError) return ctx.notFound();
      throw e;
    }
  };
};
