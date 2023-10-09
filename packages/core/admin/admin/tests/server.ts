import { rest } from 'msw';
import { setupServer } from 'msw/node';
import * as qs from 'qs';

import { MockData, mockData } from './mockData';

export const server = setupServer(
  ...[
    /**
     *
     * ADMIN ROLES
     *
     */
    rest.get('/admin/roles', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 1,
              code: 'strapi-editor',
            },

            {
              id: 2,
              code: 'strapi-author',
            },
          ],
        })
      )
    ),

    rest.get('/admin/roles/1', (req, res, ctx) =>
      res(
        ctx.json({
          data: {
            id: 1,
            code: 'strapi-editor',
            params: {
              some: req.url.searchParams.get('some'),
            },
          },
        })
      )
    ),
    rest.get('/admin/roles/:id/permissions', (req, res, ctx) => {
      return res(
        ctx.json({
          data: [
            {
              id: 1,
              action: 'plugin::content-manager.explorer.create',
              subject: 'api::address.address',
              properties: {
                fields: ['postal_code', 'categories'],
              },
              conditions: [],

              params: {
                some: req.url.searchParams.get('some'),
              },
            },
          ],
        })
      );
    }),
    /**
     *
     * ADMIN USERS
     *
     */
    rest.get('/admin/users', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            results: [
              { id: 1, firstname: 'John', lastname: 'Doe' },
              { id: 2, firstname: 'Kai', lastname: 'Doe' },
            ],
            pagination: {
              page: 1,
            },
          },
        })
      );
    }),
    rest.get('/admin/users/1', (req, res, ctx) =>
      res(
        ctx.json({
          data: {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            params: {
              some: req.url.searchParams.get('some'),
            },
          },
        })
      )
    ),
    rest.get('/admin/users/me', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            email: 'michka@michka.fr',
            firstname: 'michoko',
            lastname: 'ronronscelestes',
            username: 'yolo',
            preferedLanguage: 'en',
            roles: [
              {
                id: 2,
              },
            ],
          },
        })
      );
    }),
    /**
     *
     * ADMIN PROVIDERS
     *
     */
    rest.get('/admin/providers/isSSOLocked', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            isSSOLocked: false,
          },
        })
      );
    }),
    /**
     *
     * ADMIN PERMISSIONS
     *
     */
    rest.get('/admin/permissions', (req, res, ctx) => {
      const role = req.url.searchParams.get('role');

      if (role !== '1') {
        return res(ctx.status(404));
      }

      return res(
        ctx.json({
          data: {
            conditions: [
              {
                id: 'admin::is-creator',
                displayName: 'Is creator',
                category: 'default',
              },
            ],
            sections: {
              settings: [
                {
                  displayName: 'Access the Email Settings page',
                  category: 'email',
                  subCategory: 'general',
                  action: 'plugin::email.settings.read',
                },
              ],
            },
          },
        })
      );
    }),
    /**
     *
     * ADMIN MISC
     *
     */
    rest.get('/admin/license-limit-information', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            attribute: 1,

            features: [
              { name: 'without-options' },
              { name: 'with-options', options: { something: true } },
            ],
          },
        })
      );
    }),
    rest.get('/admin/project-settings', (req, res, ctx) => {
      return res(
        ctx.json({
          menuLogo: {
            ext: '.svg',
            height: 256,
            name: 'michka.svg',
            size: 1.3,
            url: '/uploads/michka.svg',
            width: 256,
          },
        })
      );
    }),
    rest.post('/admin/project-settings', (req, res, ctx) => {
      return res(
        ctx.json({
          menuLogo: {
            ext: '.svg',
            height: 256,
            name: 'michka.svg',
            size: 1.3,
            url: '/uploads/michka.svg',
            width: 256,
          },
        })
      );
    }),
    /**
     * WEBHOOKS
     */
    rest.get('/admin/webhooks', (req, res, ctx) => {
      return res(
        ctx.json({
          data: mockData.webhooks,
        })
      );
    }),
    rest.post('/admin/webhooks/batch-delete', async (req, res, ctx) => {
      const { ids } = await req.json<{ ids: number[] }>();

      return res(
        ctx.json({
          data: mockData.webhooks.filter((webhook) => !ids.includes(webhook.id)),
        })
      );
    }),
    rest.put('/admin/webhooks/:id', async (req, res, ctx) => {
      const { id } = req.params;
      const { isEnabled } = await req.json<{ isEnabled: boolean }>();

      return res(
        ctx.json({
          data: mockData.webhooks.map((webhook) =>
            webhook.id === Number(id) ? { ...webhook, isEnabled } : webhook
          ),
        })
      );
    }),
    /**
     * REVIEW_WORKFLOWS
     */
    rest.get('/admin/review-workflows/workflows', (req, res, ctx) => {
      return res(
        ctx.json({
          data: [
            {
              id: 1,
              stages: [
                {
                  id: 1,
                  name: 'To Review',
                  color: '#FFFFFF',
                },
              ],
            },
          ],
        })
      );
    }),
    rest.get('/content-manager/collection-types/:contentType/stages', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 1,
              name: 'Todo',
            },

            {
              id: 2,
              name: 'Done',
            },
          ],

          meta: {
            workflowCount: 10,
            stagesCount: 5,
          },
        })
      )
    ),
    rest.get('/content-manager/single-types/:contentType/stages', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 2,
              name: 'Todo',
            },

            {
              id: 3,
              name: 'Done',
            },
          ],

          meta: {
            workflowCount: 10,
            stagesCount: 5,
          },
        })
      )
    ),
    rest.put(
      '/admin/content-manager/collection-types/:contentType/:id/assignee',
      (req, res, ctx) => {
        return res(ctx.status(200));
      }
    ),
    // /**
    //  *
    //  * CONTENT_MANAGER
    //  *
    //  */
    rest.put('/content-manager/content-types/:contentType/configuration', (req, res, ctx) => {
      return res(ctx.status(200));
    }),
    rest.post('/content-manager/uid/generate', async (req, res, ctx) => {
      const body = await req.json();

      return res(
        ctx.json({
          data: body?.data?.target ?? 'regenerated',
        })
      );
    }),
    rest.post('/content-manager/uid/check-availability', async (req, res, ctx) => {
      const body = await req.json();

      return res(
        ctx.json({
          isAvailable: body?.value === 'available',
        })
      );
    }),
    rest.get('/content-manager/collection-types/:contentType', (req, res, ctx) => {
      return res(
        ctx.json({
          results: [
            {
              id: 1,
              name: 'Entry 1',
              publishedAt: null,
            },
            {
              id: 2,
              name: 'Entry 2',
              publishedAt: null,
            },
            {
              id: 3,
              name: 'Entry 3',
              publishedAt: null,
            },
          ],
        })
      );
    }),
    rest.post(
      '/content-manager/collection-types/:contentType/actions/bulkPublish',
      (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              count: 3,
            },
          })
        );
      }
    ),
    rest.get(
      '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
      (req, res, ctx) => {
        return res(
          ctx.json({
            data: 0,
          })
        );
      }
    ),
    /**
     *
     * MARKETPLACE
     *
     */
    rest.get('https://market-api.strapi.io/providers', (req, res, ctx) => {
      const { collections = [], search = '' } = qs.parse(req.url.searchParams.toString()) as {
        collections: Array<keyof MockData['marketplace']['providers']>;
        search: string;
      };

      const [madeByStrapi, verified] = collections;

      let responseData;

      const providerResponses = mockData.marketplace.providers;

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

      const filteredResponse = {
        ...responseData,
        data: responseData.data.filter((provider) => {
          const nameMatch = provider.attributes.name.toLowerCase().includes(search.toLowerCase());
          const descriptionMatch = provider.attributes.description
            .toLowerCase()
            .includes(search.toLowerCase());

          return nameMatch || descriptionMatch;
        }),
      };

      return res(ctx.status(200), ctx.json(filteredResponse));
    }),
    rest.get('https://market-api.strapi.io/plugins', (req, res, ctx) => {
      const {
        collections = [],
        categories = [],
        search = '',
      } = qs.parse(req.url.searchParams.toString()) as {
        collections: Array<keyof MockData['marketplace']['plugins']>;
        categories: Array<keyof MockData['marketplace']['plugins']>;
        search: string;
      };
      const [madeByStrapi, verified] = collections;
      const [customFields, monitoring] = categories;

      let responseData;
      const pluginResponses = mockData.marketplace.plugins;

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

      const filteredResponse = {
        ...responseData,
        data: responseData.data.filter((plugin) => {
          const nameMatch = plugin.attributes.name.toLowerCase().includes(search.toLowerCase());
          const descriptionMatch = plugin.attributes.description
            .toLowerCase()
            .includes(search.toLowerCase());

          return nameMatch || descriptionMatch;
        }),
      };

      return res(ctx.status(200), ctx.json(filteredResponse));
    }),
    /**
     *
     * NPS SURVEY
     *
     */
    rest.post('https://analytics.strapi.io/submit-nps', (req, res, ctx) => {
      return res(ctx.status(200));
    }),
  ]
);
