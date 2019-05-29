const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;

  const target = source === 'admin' ? strapi.admin : strapi.plugins[source];

  if (
    source &&
    _.get(target, [
      'config',
      'layout',
      ctx.params.model,
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
      [],
    ).split('.');

    if (controller && action) {
      // Redirect to specific controller.
      if (
        ctx.request.body.hasOwnProperty('fields') &&
        ctx.request.body.hasOwnProperty('files')
      ) {
        let { files, fields } = ctx.request.body;

        const parser = value => {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Silent.
          }

          return _.isArray(value) ? value.map(obj => parser(obj)) : value;
        };

        fields = Object.keys(fields).reduce((acc, current) => {
          acc[current] = parser(fields[current]);

          return acc;
        }, {});

        ctx.request.body = fields;

        await target.controllers[controller.toLowerCase()][action](ctx);
        const resBody = ctx.body;

        await Promise.all(
          Object.keys(files).map(async field => {
            ctx.request.body = {
              files: {
                files: files[field],
              },
              fields: {
                refId: resBody.id || resBody._id,
                ref: ctx.params.model,
                source,
                field,
              },
            };

            return strapi.plugins.upload.controllers.upload.upload(ctx);
          }),
        );

        return ctx.send(resBody);
      }

      return await target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
