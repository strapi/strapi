'use strict';

const _ = require('lodash');

const parseMultipartBody = require('../../utils/parse-multipart');
const uploadFiles = require('../../utils/upload-files');

module.exports = async (ctx, next) => {
  const { model } = ctx.params;

  const ct = strapi.contentTypes[model];

  if (!ct) {
    return ctx.send({ error: 'contentType.notFound' }, 404);
  }

  const target = ct.plugin === 'admin' ? strapi.admin : strapi.plugins[ct.plugin];

  const actionPath = ['config', 'layout', ct.modelName, 'actions', ctx.request.route.action];

  if (_.has(target, actionPath)) {
    const [controller, action] = _.get(target, actionPath, []).split('.');

    if (controller && action) {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartBody(ctx);
        ctx.request.body = data;
        ctx.request.files = {};

        await target.controllers[controller.toLowerCase()][action](ctx);
        const resBody = ctx.body;

        if (ctx.status >= 300) return;

        await uploadFiles(resBody, files, {
          model: ct.modelName,
          source: ct.plugin,
        });

        return ctx.send(resBody);
      }

      return await target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
