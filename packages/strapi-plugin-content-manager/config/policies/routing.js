const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;

  if (source && _.get(strapi.plugins, [source, 'config', 'layout', ctx.params.model, 'actions', ctx.request.route.action])) {
    const [ controller, action ] = _.get(strapi.plugins, [source, 'config', 'layout', ctx.params.model, 'actions', ctx.request.route.action], []).split('.');

    if (controller && action) {
      // Redirect to specific controller.
      if (ctx.request.body.hasOwnProperty('fields') && ctx.request.body.hasOwnProperty('files')) {
        const {files, fields} = _.cloneDeep(ctx.request.body);

        const fileAttributes = _.get(strapi.plugins, [source, 'models', ctx.params.model, 'associations'], []).filter(association => {
          return association[association.type] === 'file' && association.via === 'related';
        }).reduce((acc, association) => {
          acc.push(association.alias);
          return acc;
        }, []);

        ctx.request.body = _.omit(fields, fileAttributes);

        await strapi.plugins[source].controllers[controller.toLowerCase()][action](ctx);
        const resBody = _.cloneDeep(ctx.body);

        Object.keys(files).map(async field => {
          ctx.request.body = {
            files: {
              files: files[field]
            },
            fields: {
              refId: resBody.id || resBody._id,
              ref: ctx.params.model,
              source,
              field
            }
          };

          await strapi.plugins.upload.controllers.upload.upload(ctx);
        });
        return ctx.send(resBody);
      } else {
        return await strapi.plugins[source].controllers[controller.toLowerCase()][action](ctx);
      }
    }
  }

  await next();
};
