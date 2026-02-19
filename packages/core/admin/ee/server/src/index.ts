import register from './register';
import bootstrap from './bootstrap';
import destroy from './destroy';
import adminContentTypes from './content-types';
import services from './services';
import controllers from './controllers';
import routes from './routes';
import auditLogsRoutes from './audit-logs/routes/audit-logs';
import auditLogsController from './audit-logs/controllers/audit-logs';
import { createAuditLogsService } from './audit-logs/services/audit-logs';
import { createAuditLogsLifecycleService } from './audit-logs/services/lifecycles';
import { auditLog } from './audit-logs/content-types/audit-log';
import aiRoutes from './ai/routes/ai';
import aiController from './ai/controllers/ai';
import type { Core } from '@strapi/types';
import { createAIContainer } from './ai/containers/ai';

const getAdminEE = () => {
  const eeAdmin = {
    register,
    bootstrap,
    destroy,
    contentTypes: {
      // Always register the audit-log content type to prevent data loss
      'audit-log': auditLog,
      ...adminContentTypes,
    },
    services,
    controllers,
    routes,
  };

  const isAIEnabled =
    strapi.config.get('admin.ai.enabled', true) && strapi.ee.features.isEnabled('cms-ai');

  const isAuditLogsEnabled =
    strapi.config.get('admin.auditLogs.enabled', true) &&
    strapi.ee.features.isEnabled('audit-logs');

  const state = {
    aiServiceRegistered: false,
    aiRoutesRegistered: isAIEnabled,
    auditLogsServiceRegistered: false,
    auditLogsLifecycleRegistered: false,
    auditLogsRoutesRegistered: isAuditLogsEnabled,
    eeEnableUnsubscribe: undefined as undefined | (() => void),
    eeUpdateUnsubscribe: undefined as undefined | (() => void),
  };

  const addAdminRouteScope = (route: Core.RouteInput) => {
    const prefix = 'admin::';

    if (typeof route.handler !== 'string') {
      return;
    }

    const scope = route.handler.startsWith(prefix) ? route.handler : `${prefix}${route.handler}`;

    route.config = route.config ?? {};

    if (route.config.auth === false) {
      return;
    }

    route.config.auth = route.config.auth ?? {};
    route.config.auth.scope = route.config.auth.scope ?? [scope];
  };

  const registerAdminRoutes = (routes: Core.RouterInput) => {
    const routerInput = structuredClone(routes);

    const normalizedRoutes = routerInput.routes.map((route) => {
      addAdminRouteScope(route);

      return {
        ...route,
        info: { ...(route.info ?? {}), pluginName: 'admin', type: 'admin' },
      } satisfies Core.Route;
    });

    const adminRouter: Core.Router = {
      type: 'admin',
      prefix: '/admin',
      routes: normalizedRoutes,
    };

    strapi.server.routes(adminRouter);
  };

  const registerAI = ({ strapi }: { strapi: Core.Strapi }) => {
    const shouldRegister =
      strapi.config.get('admin.ai.enabled', true) && strapi.ee.features.isEnabled('cms-ai');

    if (!shouldRegister) {
      return;
    }

    strapi.get('controllers').set('admin::ai', aiController);

    if (!state.aiRoutesRegistered) {
      registerAdminRoutes(aiRoutes);
      state.aiRoutesRegistered = true;
    }

    if (!state.aiServiceRegistered) {
      strapi.add('ai', createAIContainer({ strapi }));
      state.aiServiceRegistered = true;
    }
  };

  const registerAuditLogs = async ({ strapi }: { strapi: Core.Strapi }) => {
    const shouldRegister =
      strapi.config.get('admin.auditLogs.enabled', true) &&
      strapi.ee.features.isEnabled('audit-logs');

    if (!shouldRegister) {
      return;
    }

    strapi.get('controllers').set('admin::audit-logs', auditLogsController);

    if (!state.auditLogsRoutesRegistered) {
      registerAdminRoutes(auditLogsRoutes);
      state.auditLogsRoutesRegistered = true;
    }

    if (!state.auditLogsServiceRegistered) {
      strapi.add('audit-logs', createAuditLogsService(strapi));
      state.auditLogsServiceRegistered = true;
    }

    if (!state.auditLogsLifecycleRegistered) {
      const auditLogsLifecycle = createAuditLogsLifecycleService(strapi);
      strapi.add('audit-logs-lifecycle', auditLogsLifecycle);
      await auditLogsLifecycle.register();
      state.auditLogsLifecycleRegistered = true;
    }
  };

  const registerDynamicFeatures = async ({ strapi }: { strapi: Core.Strapi }) => {
    registerAI({ strapi });
    await registerAuditLogs({ strapi });
  };

  return {
    ...eeAdmin,
    controllers: {
      ...eeAdmin.controllers,
      ...(isAuditLogsEnabled ? { 'audit-logs': auditLogsController } : {}),
      ...(isAIEnabled ? { ai: aiController } : {}),
    },
    routes: {
      ...eeAdmin.routes,
      ...(isAuditLogsEnabled ? { 'audit-logs': auditLogsRoutes } : {}),
      ...(isAIEnabled ? { ai: aiRoutes } : {}),
    },
    async register({ strapi }: { strapi: Core.Strapi }) {
      // Run the the default registration
      await eeAdmin.register({ strapi });

      if (!state.eeEnableUnsubscribe) {
        state.eeEnableUnsubscribe = strapi.eventHub.on('ee.enable', () =>
          registerDynamicFeatures({ strapi })
        );
      }

      if (!state.eeUpdateUnsubscribe) {
        state.eeUpdateUnsubscribe = strapi.eventHub.on('ee.update', () =>
          registerDynamicFeatures({ strapi })
        );
      }

      await registerDynamicFeatures({ strapi });
    },
    async destroy({ strapi }: { strapi: Core.Strapi }) {
      if (state.eeEnableUnsubscribe) {
        state.eeEnableUnsubscribe();
      }

      if (state.eeUpdateUnsubscribe) {
        state.eeUpdateUnsubscribe();
      }

      if (state.auditLogsLifecycleRegistered) {
        strapi.get('audit-logs-lifecycle').destroy();
      }
      await eeAdmin.destroy({ strapi });
    },
  };
};

export default getAdminEE;
