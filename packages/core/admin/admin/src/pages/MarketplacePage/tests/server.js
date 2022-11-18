import { setupServer } from 'msw/node';
import { rest } from 'msw';
import qs from 'qs';
import { responses as pluginResponses } from './mocks/plugins';
import { responses as providerResponses } from './mocks/providers';

const handlers = [
  rest.get('https://market-api.strapi.io/plugins', (req, res, ctx) => {
    const { collections = [], categories = [] } = qs.parse(req.url.searchParams.toString());
    const [madeByStrapi, verified] = collections;
    const [customFields, monitoring] = categories;

    let responseData;

    if (categories.length && collections.length) {
      responseData = {
        data: [...pluginResponses[collections[0]].data, ...pluginResponses[categories[0]].data],
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
    } else if (collections.length) {
      responseData = pluginResponses[collections[0]];
    } else if (categories.length) {
      responseData = pluginResponses[categories[0]];
    } else {
      responseData = pluginResponses.plugins;
    }

    return res(ctx.status(200), ctx.json(responseData));
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
    const { collections = [] } = qs.parse(req.url.searchParams.toString());
    const [madeByStrapi, verified] = collections;

    let responseData;

    if (madeByStrapi && verified) {
      responseData = {
        data: [...providerResponses[madeByStrapi].data, ...providerResponses[verified].data],
        meta: providerResponses.providers.meta,
      };
    } else if (collections.length) {
      responseData = providerResponses[collections[0]];
    } else {
      responseData = providerResponses.providers;
    }

    return res(ctx.status(200), ctx.json(responseData));
  }),
];

const server = setupServer(...handlers);

export default server;
