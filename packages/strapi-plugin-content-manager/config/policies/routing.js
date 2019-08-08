const _ = require('lodash');

const parseMultipartBody = require('../../utils/parse-multipart');
const uploadFiles = require('../../utils/upload-files');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;
  const { model } = ctx.request.params;

  const target = source === 'admin' ? strapi.admin : strapi.plugins[source];

  if (
    source &&
    _.get(target, [
      'config',
      'layout',
      model,
      'actions',
      ctx.request.route.action,
    ])
  ) {
    const [controller, action] = _.get(
      target,
      [
        'config',
        'layout',
        ctx.params.model,
        'actions',
        ctx.request.route.action,
      ],
      []
    ).split('.');

    if (controller && action) {
      // TODO: handle in the targeted controller directly
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartBody(ctx);
        ctx.request.body = data;
        ctx.request.files = {};

        await target.controllers[controller.toLowerCase()][action](ctx);
        const resBody = ctx.body;

        if (ctx.status >= 300) return;

        await uploadFiles(resBody, files, { model, source });

        return ctx.send(resBody);
      }

      return await target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
