import { http, HttpResponse } from 'msw';
import { type SetupServer, setupServer } from 'msw/node';

import { mockData } from './mockData';

export const server: SetupServer = setupServer(
  ...[
    /**
     * TRACKING
     */
    http.post('https://analytics.strapi.io/api/v2/track', () => {
      return HttpResponse.json({});
    }),
    /**
     *
     * ADMIN ROLES
     *
     */
    http.get('/admin/roles', () =>
      HttpResponse.json({
        data: [
          {
            id: 1,
            code: 'strapi-editor',
            name: 'Editor',
          },
          {
            id: 2,
            code: 'strapi-author',
            name: 'Author',
          },
        ],
      })
    ),

    http.get('/admin/roles/1', ({ request }) =>
      HttpResponse.json({
        data: {
          id: 1,
          code: 'strapi-editor',
          params: {
            filters: new URL(request.url).searchParams.get('filters'),
          },
        },
      })
    ),
    http.get('/admin/roles/:id/permissions', ({ request }) => {
      return HttpResponse.json({
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
              filters: new URL(request.url).searchParams.get('filters'),
            },
          },
        ],
      });
    }),
    /**
     *
     * ADMIN USERS
     *
     */
    http.get('/admin/users', () => {
      return HttpResponse.json({
        data: {
          results: [
            { id: 1, firstname: 'John', lastname: 'Doe', roles: [] },
            { id: 2, firstname: 'Kai', lastname: 'Doe', roles: [] },
          ],
          pagination: {
            page: 1,
          },
        },
      });
    }),
    http.get('/admin/users/1', ({ request }) =>
      HttpResponse.json({
        data: {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          emai: 'test@testing.com',
          roles: [
            { id: 1, code: 'strapi-editor', name: 'Editor' },
            { id: 2, code: 'strapi-super-admin', name: 'Super Admin' },
          ],
          params: {
            some: new URL(request.url).searchParams.get('some'),
          },
        },
      })
    ),
    http.get('/admin/users/me', () => {
      return HttpResponse.json({
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
      });
    }),
    http.get('/admin/users/me/permissions', () => HttpResponse.json({ data: [] })),
    /**
     *
     * ADMIN PROVIDERS
     *
     */
    http.get('/admin/providers/isSSOLocked', () => {
      return HttpResponse.json({
        data: {
          isSSOLocked: false,
        },
      });
    }),
    http.put('/admin/providers/options', () =>
      HttpResponse.json({
        data: {
          autoRegister: false,
          defaultRole: '1',
          ssoLockedRoles: ['1', '2', '3'],
        },
      })
    ),
    http.get('/admin/providers/options', () =>
      HttpResponse.json({
        data: {
          autoRegister: false,
          defaultRole: '1',
          ssoLockedRoles: ['1', '2'],
        },
      })
    ),
    /**
     *
     * ADMIN PERMISSIONS
     *
     */
    http.get('/admin/permissions', ({ request }) => {
      const role = new URL(request.url).searchParams.get('role');

      if (role !== '1') {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json({
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
      });
    }),
    /**
     *
     * ADMIN MISC
     *
     */
    http.get('/admin/init', () => {
      return HttpResponse.json({
        data: {},
      });
    }),
    http.get('/admin/information', () =>
      HttpResponse.json({
        autoReload: true,
        communityEdition: false,
        currentEnvironment: 'development',
        nodeVersion: 'v14.13.1',
        strapiVersion: '3.6.0',
      })
    ),
    http.get('/admin/license-limit-information', () => {
      return HttpResponse.json({
        data: {
          attribute: 1,

          features: [{ name: 'sso' }, { name: 'audit-logs', options: { retentionDays: 1 } }],
        },
      });
    }),
    http.get('/admin/project-settings', () => {
      return HttpResponse.json({
        menuLogo: {
          ext: '.svg',
          height: 256,
          name: 'michka.svg',
          size: 1.3,
          url: '/uploads/michka.svg',
          width: 256,
        },
      });
    }),
    http.post('/admin/project-settings', () => {
      return HttpResponse.json({
        menuLogo: {
          ext: '.svg',
          height: 256,
          name: 'michka.svg',
          size: 1.3,
          url: '/uploads/michka.svg',
          width: 256,
        },
      });
    }),
    http.get('/admin/transfer/tokens', () => {
      return HttpResponse.json({
        data: [
          {
            id: 1,
            name: 'My super token',
            description: 'This describe my super token',
            type: 'read-only',
            createdAt: '2021-11-15T00:00:00.000Z',
            permissions: [],
          },
        ],
      });
    }),
    http.get('/admin/transfer/tokens/:id', () => {
      return HttpResponse.json({
        data: {
          id: 1,
          name: 'My super token',
          description: 'This describe my super token',
          type: 'read-only',
          createdAt: '2021-11-15T00:00:00.000Z',
          permissions: [],
        },
      });
    }),
    http.get('/admin/registration-info', ({ request }) => {
      const token = new URL(request.url).searchParams.get('registrationToken');

      if (token === 'error') {
        return HttpResponse.json({}, { status: 500 });
      }

      return HttpResponse.json({
        data: {
          firstname: 'Token firstname',
          lastname: 'Token lastname',
          email: 'test+register-token@strapi.io',
        },
      });
    }),
    http.post('/admin/renew-token', () => {
      return HttpResponse.json({
        data: {
          token: 'renewed-test-token',
        },
      });
    }),
    http.get('/admin/guided-tour-meta', () => {
      return HttpResponse.json({
        data: {
          isFirstSuperAdminUser: false,
          completedActions: [],
        },
      });
    }),
    /**
     * WEBHOOKS
     */
    http.get('/admin/webhooks', () => {
      return HttpResponse.json({
        data: mockData.webhooks,
      });
    }),
    http.post<Record<string, never>, { ids: number[] }>(
      '/admin/webhooks/batch-delete',
      async ({ request }) => {
        const { ids } = await request.json();

        return HttpResponse.json({
          data: mockData.webhooks.filter((webhook) => !ids.includes(webhook.id)),
        });
      }
    ),
    http.put<{ id: string }, { isEnabled: boolean }>(
      '/admin/webhooks/:id',
      async ({ request, params }) => {
        const { id } = params;
        const { isEnabled } = await request.json();

        return HttpResponse.json({
          data: mockData.webhooks.map((webhook) =>
            webhook.id === Number(id) ? { ...webhook, isEnabled } : webhook
          ),
        });
      }
    ),
    /**
     *
     * CONTENT_MANAGER
     *
     */
    http.get('/content-manager/content-types', () =>
      HttpResponse.json({
        data: [
          {
            uid: 'admin::collectionType',
            isDisplayed: true,
            apiID: 'permission',
            kind: 'collectionType',
          },

          {
            uid: 'admin::collectionTypeNotDispalyed',
            isDisplayed: false,
            apiID: 'permission',
            kind: 'collectionType',
          },

          {
            uid: 'admin::singleType',
            isDisplayed: true,
            kind: 'singleType',
          },

          {
            uid: 'admin::singleTypeNotDispalyed',
            isDisplayed: false,
            kind: 'singleType',
          },
        ],
      })
    ),
    http.get('/content-manager/components', () =>
      HttpResponse.json({
        data: [
          {
            uid: 'basic.relation',
            isDisplayed: true,
            apiID: 'relation',
            category: 'basic',
            info: {
              displayName: 'Relation',
            },
            options: {},
            attributes: {
              id: {
                type: 'integer',
              },
              categories: {
                type: 'relation',
                relation: 'oneToMany',
                target: 'api::category.category',
                targetModel: 'api::category.category',
                relationType: 'oneToMany',
              },
            },
          },
        ],
      })
    ),
    /**
     *
     * NPS SURVEY
     *
     */
    http.post('https://analytics.strapi.io/submit-nps', () => {
      return HttpResponse.json({});
    }),
    /**
     * CONTENT-API (API TOKENS)
     */
    http.get('/admin/content-api/permissions', () => {
      return HttpResponse.json({
        data: {
          'api::address': {
            controllers: {
              address: ['find', 'findOne'],
            },
          },
          'plugin::myplugin': {
            controllers: {
              test: ['findOne', 'find'],
            },
          },
        },
      });
    }),
    http.get('/admin/content-api/routes', () => {
      return HttpResponse.json({
        data: {
          'api::address': [
            {
              method: 'GET',
              path: '/api/addresses',
              handler: 'api::address.address.find',
              config: {
                auth: {
                  scope: ['api::address.address.find'],
                },
              },
              info: {
                apiName: 'address',
                type: 'content-api',
              },
            },
            {
              method: 'GET',
              path: '/api/addresses/:id',
              handler: 'api::address.address.findOne',
              config: {
                auth: {
                  scope: ['api::address.address.findOne'],
                },
              },
              info: {
                apiName: 'address',
                type: 'content-api',
              },
            },
          ],
          'plugin::myplugin': [
            {
              method: 'GET',
              path: '/api/myplugin/tests',
              handler: 'plugin::myplugin.test.find',
              config: {
                auth: {
                  scope: ['plugin::myplugin.test.find'],
                },
              },
              info: {
                pluginName: 'myplugin',
                type: 'content-api',
              },
            },
            {
              method: 'GET',
              path: '/api/myplugin/tests/:id',
              handler: 'plugin::myplugin.test.findOne',
              config: {
                auth: {
                  scope: ['plugin::myplugin.test.findOne'],
                },
              },
              info: {
                pluginName: 'myplugin',
                type: 'content-api',
              },
            },
          ],
        },
      });
    }),
    /**
     * API TOKENS
     */
    http.get('/admin/api-tokens', () => {
      return HttpResponse.json({
        data: [
          {
            id: '1',
            name: 'My super token',
            description: 'This describe my super token',
            type: 'read-only',
            createdAt: '2021-11-15T00:00:00.000Z',
            permissions: [],
          },
        ],
      });
    }),
    http.get('/admin/api-tokens/:id', () => {
      return HttpResponse.json({
        data: {
          id: '1',
          name: 'My super token',
          description: 'This describe my super token',
          type: 'read-only',
          createdAt: '2021-11-15T00:00:00.000Z',
          permissions: [],
        },
      });
    }),
    /**
     * Audit Logs
     */
    http.get('/admin/audit-logs', () => {
      return HttpResponse.json({
        results: [
          {
            id: 1,
            action: 'admin.logout',
            date: '2023-10-31T15:56:54.873Z',
            payload: {
              user: {
                id: 1,
                firstname: 'test',
                lastname: 'testing',
                username: null,
                email: 'test@testing.com',
                isActive: true,
                blocked: false,
                preferedLanguage: null,
                createdAt: '2023-10-26T19:19:38.245Z',
                updatedAt: '2023-10-26T19:19:38.245Z',
                roles: [
                  {
                    id: 1,
                    name: 'Super Admin',
                    description: 'Super Admins can access and manage all features and settings.',
                    code: 'strapi-super-admin',
                  },
                ],
              },
            },
            user: {
              id: 1,
              email: 'test@testing.com',
              displayName: 'test testing',
            },
          },
          {
            id: 2,
            action: 'user.create',
            date: '2023-10-31T15:57:38.957Z',
            payload: {
              user: {
                id: 2,
                firstname: 'editor',
                lastname: 'test',
                username: null,
                email: 'editor@testing.com',
                isActive: true,
                blocked: false,
                preferedLanguage: null,
                createdAt: '2023-10-31T15:57:38.948Z',
                updatedAt: '2023-10-31T15:57:38.948Z',
                roles: [
                  {
                    id: 2,
                    name: 'Editor',
                    description:
                      'Editors can manage and publish contents including those of other users.',
                    code: 'strapi-editor',
                  },
                ],
              },
            },
            user: {
              id: 1,
              email: 'test@testing.com',
              displayName: 'test testing',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 2,
          pageCount: 1,
          total: 2,
        },
      });
    }),
    http.get('/admin/audit-logs/:id', () => {
      return HttpResponse.json({
        id: 1,
        action: 'admin.logout',
        date: '2023-10-31T15:56:54.873Z',
        payload: {
          user: {
            id: 1,
            firstname: 'test',
            lastname: 'testing',
            username: null,
            email: 'test@testing.com',
            isActive: true,
            blocked: false,
            preferedLanguage: null,
            createdAt: '2023-10-26T19:19:38.245Z',
            updatedAt: '2023-10-26T19:19:38.245Z',
            roles: [
              {
                id: 1,
                name: 'Super Admin',
                description: 'Super Admins can access and manage all features and settings.',
                code: 'strapi-super-admin',
              },
            ],
          },
        },
        user: {
          id: 1,
          email: 'test@testing.com',
          displayName: 'test testing',
        },
      });
    }),
    /**
     *
     * fetchClient, useFetchClient and getFetchClient
     *
     */
    http.get('/use-fetch-client-test', () => {
      return HttpResponse.json({
        data: {
          results: [
            { id: 2, name: 'newest', publishedAt: null },
            { id: 1, name: 'oldest', publishedAt: null },
          ],
          pagination: { page: 1, pageCount: 10 },
        },
      });
    }),
    http.get('/test-fetch-client', () => {
      return HttpResponse.json({});
    }),
  ]
);
