import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const routes: (
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        auth: boolean;
        policies?: undefined;
      };
    }
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        policies: (string | { name: string; config: { actions: string[] } })[];
        auth?: undefined;
      };
    }
)[] = [
  {
    method: 'GET',
    path: '/init',
    handler: 'admin.init',
    config: { auth: false },
  },
  {
    method: 'GET',
    path: '/project-settings',
    handler: 'admin.getProjectSettings',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::project-settings.read'] },
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/project-settings',
    handler: 'admin.updateProjectSettings',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::project-settings.update'] },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/project-type',
    handler: 'admin.getProjectType',
    config: { auth: false },
  },
  {
    method: 'GET',
    path: '/information',
    handler: 'admin.information',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/telemetry-properties',
    handler: 'admin.telemetryProperties',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/plugins',
    handler: 'admin.plugins',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::marketplace.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/license-trial-time-left',
    handler: 'admin.licenseTrialTimeLeft',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/guided-tour-meta',
    handler: 'admin.getGuidedTourMeta',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/debug-dump',
    handler: 'admin.debugDump',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::debug-dump.read'] } },
      ],
    },
  },
] satisfies Core.RouteInputFor<Controllers>[];

export default routes;
