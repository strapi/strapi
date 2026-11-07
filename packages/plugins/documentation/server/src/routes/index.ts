import type Koa from 'koa';
import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';
import restrictAccess from '../middlewares/restrict-access';

// The published type stays the one develop infers; `satisfies` checks the literals.
const routes: (
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        auth: boolean;
        middlewares: ((ctx: Koa.Context, next: Koa.Next) => Promise<any>)[];
        policies?: undefined;
      };
    }
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        auth: boolean;
        middlewares?: undefined;
        policies?: undefined;
      };
    }
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        policies: { name: string; config: { actions: string[] } }[];
        auth?: undefined;
        middlewares?: undefined;
      };
    }
)[] = [
  {
    method: 'GET',
    path: '/',
    handler: 'documentation.index',
    config: {
      auth: false,
      middlewares: [restrictAccess],
    },
  },
  {
    method: 'GET',
    path: '/v:major(\\d+).:minor(\\d+).:patch(\\d+)',
    handler: 'documentation.index',
    config: {
      auth: false,
      middlewares: [restrictAccess],
    },
  },
  {
    method: 'GET',
    path: '/login',
    handler: 'documentation.loginView',
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/login',
    handler: 'documentation.login',
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/getInfos',
    handler: 'documentation.getInfos',
    config: {
      policies: [
        { name: 'admin::hasPermissions', config: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/regenerateDoc',
    handler: 'documentation.regenerateDoc',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: { actions: ['plugin::documentation.settings.regenerate'] },
        },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/updateSettings',
    handler: 'documentation.updateSettings',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: { actions: ['plugin::documentation.settings.update'] },
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/deleteDoc/:version',
    handler: 'documentation.deleteDoc',
    config: {
      policies: [],
    },
  },
] satisfies Core.RouteInputFor<Controllers, 'plugin::documentation'>[];

export default routes;
