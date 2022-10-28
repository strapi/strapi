import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { responses as pluginResponses } from './mocks/plugins';
import { responses as providerResponses } from './mocks/providers';

const handlers = [
  rest.get('https://market-api.strapi.io/plugins', (req, res, ctx) => {
    let responseData;
    const collection = req.url.searchParams.get('collections[]');
    const category = req.url.searchParams.get('categories[]');
    const [madeByStrapi, verified] = req.url.searchParams.getAll('collections[]');
    const [customFields, monitoring] = req.url.searchParams.getAll('categories[]');

    if (category && collection) {
      responseData = {
        data: [...pluginResponses[collection].data, ...pluginResponses[category].data],
        meta: pluginResponses.plugins.meta,
      };
    } else if (madeByStrapi && verified) {
      responseData = {
        data: [...pluginResponses[madeByStrapi].data, ...pluginResponses[verified].data],
        meta: pluginResponses.plugins.meta,
      };
    } else if (customFields && monitoring) {
      responseData = {
        data: [...pluginResponses[customFields].data, ...pluginResponses[monitoring].data],
        meta: pluginResponses.plugins.meta,
      };
    } else if (collection) {
      responseData = pluginResponses[collection];
    } else if (category) {
      responseData = pluginResponses[category];
    } else {
      responseData = pluginResponses.plugins;
    }

    return res(ctx.delay(100), ctx.status(200), ctx.json(responseData));
  }),

  rest.get('*/admin/information', (req, res, ctx) => {
    return res(
      ctx.delay(10),
      ctx.status(200),
      ctx.json({
        data: {
          currentEnvironment: 'development',
          autoReload: true,
          strapiVersion: '4.1.0',
          dependencies: {
            '@strapi/plugin-documentation': '4.1.0',
          },
          nodeVersion: 'v14.18.1',
          communityEdition: true,
          useYarn: false,
        },
      })
    );
  }),

  rest.get('https://market-api.strapi.io/providers', (req, res, ctx) => {
    let responseData;
    const collection = req.url.searchParams.get('collections[]');
    const [madeByStrapi, verified] = req.url.searchParams.getAll('collections[]');

    if (madeByStrapi && verified) {
      responseData = {
        data: [...providerResponses[madeByStrapi].data, ...providerResponses[verified].data],
        meta: providerResponses.providers.meta,
      };
    } else if (collection) {
      responseData = providerResponses[collection];
    } else {
      responseData = providerResponses.providers;
    }

    return res(ctx.delay(100), ctx.status(200), ctx.json(responseData));
  }),
];

const server = setupServer(...handlers);

export default server;
