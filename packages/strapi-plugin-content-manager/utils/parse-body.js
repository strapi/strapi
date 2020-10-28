'use strict';

const parseMultipartBody = require('./parse-multipart');

module.exports = ctx => {
  const { body } = ctx.request;
  return ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };
};
