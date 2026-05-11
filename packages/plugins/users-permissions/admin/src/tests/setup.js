import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import pluginId from '../pluginId';

const role = {
  id: 1,
  name: 'Authenticated',
  description: 'Default role given to authenticated user.',
  type: 'authenticated',
  createdAt: '2021-09-08T16:26:18.061Z',
  updatedAt: '2021-09-08T16:26:18.061Z',
  permissions: {
    'api::address': {
      controllers: {
        address: {
          create: {
            enabled: false,
            policy: '',
          },
        },
      },
    },
  },
};

let roleVersion = 0;

const handlers = [
  // Mock get role route
  http.get(`*/${pluginId}/roles/:roleId`, ({ params }) => {
    return HttpResponse.json({
      role: {
        ...role,
        id: Number(params.roleId),
        /**
         * @note React Query will bail out of notifying listeners if the response deep-equals
         * the previous response. Bump a version to ensure a new reference so Formik can
         * reinitialize its values during tests.
         */
        version: ++roleVersion,
      },
    });
  }),

  // Mock edit role route
  http.put(`*/${pluginId}/roles/:roleId`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // Mock create role route
  http.post(`*/${pluginId}/roles`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // Mock get all routes route
  http.get(`*/${pluginId}/routes`, () => {
    return HttpResponse.json({
      routes: {
        'api::address': [
          {
            method: 'POST',
            path: '/addresses',
            handler: 'address.create',
            config: {
              policies: [],
              auth: {
                scope: 'api::address.address.create',
              },
            },
            info: {
              apiName: 'address',
              type: 'content-api',
            },
          },
        ],
      },
    });
  }),

  // Mock permissions route
  http.get(`*/${pluginId}/permissions`, () => {
    return HttpResponse.json({
      permissions: {
        'api::address': {
          controllers: {
            address: {
              create: {
                enabled: false,
                policy: '',
              },
            },
          },
        },
      },
    });
  }),

  http.get('*/roles', () => {
    return HttpResponse.json({
      roles: [
        {
          id: 1,
          name: 'Authenticated',
          description: 'Default role given to authenticated user.',
          type: 'authenticated',
          nb_users: 0,
        },
        {
          id: 2,
          name: 'Public',
          description: 'Default role given to unauthenticated user.',
          type: 'public',
          nb_users: 0,
        },
      ],
    });
  }),

  http.get('*/providers', () => {
    return HttpResponse.json({
      email: { enabled: true, icon: 'envelope' },
      discord: {
        callback: '/auth/discord/callback',
        enabled: false,
        icon: 'discord',
        key: '',
        scope: ['identify', 'email'],
        secret: '',
      },
    });
  }),

  http.get('*/email-templates', () => {
    return HttpResponse.json({
      email_confirmation: {
        display: 'Email.template.email_confirmation',
        options: {
          from: {
            email: 'mochoko@strapi.io',
            name: 'Administration Panel',
          },
          message: 'Thank you for registering. Please click on the link below.',
          object: 'Account confirmation',
          response_email: '',
        },
      },
      reset_password: {
        display: 'Email.template.reset_password',
        options: {
          from: {
            email: 'mochoko@strapi.io',
            name: 'Administration Panel',
          },
          message: 'We heard that you lost your password. Sorry about that!',
          object: 'Reset password',
          response_email: '',
        },
      },
    });
  }),

  http.get('*/advanced', () => {
    return HttpResponse.json({
      roles: [{ name: 'Authenticated', type: 'authenticated' }],
      settings: {
        allow_register: false,
        default_role: 'authenticated',
        email_confirmation: false,
        email_confirmation_redirection: '',
        email_reset_password: 'https://cat-bounce.com/',
        unique_email: false,
      },
    });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen();
});

afterAll(() => {
  server.close();
});
