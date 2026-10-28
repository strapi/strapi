import { Core } from '@strapi/types';
import { getAdminService, getService } from './utils';
import actions from './config/actions';

import defaultStages from './constants/default-stages.json';
import defaultWorkflow from './constants/default-workflow.json';
import webhookEvents from './constants/webhook-events';
import { registerAuditEvents } from './audit-logs';

/**
 * Initialize the default workflow if there is no workflow in the database
 */

async function initDefaultWorkflow() {
  const workflowsService = getService('workflows', { strapi });
  const stagesService = getService('stages', { strapi });

  const wfCount = await workflowsService.count();
  const stagesCount = await stagesService.count();

  // Check if there is nothing about review-workflow in DB
  // If any, the feature has already been initialized with a workflow and stages
  if (wfCount === 0 && stagesCount === 0) {
    const workflow = {
      ...defaultWorkflow,
      contentTypes: [],
      stages: defaultStages,
    };

    await workflowsService.create({ data: workflow });
  }
}

/**
 * Webhook store limits the events that can be triggered,
 * this function extends it with the events review workflows can trigger
 */
const registerWebhookEvents = async () =>
  Object.entries(webhookEvents).forEach(([eventKey, event]) =>
    strapi.get('webhookStore').addAllowedEvent(eventKey, event)
  );

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Permissions
  const { actionProvider } = getAdminService('permission');
  // The declared permission action IDs match the registered actions.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type ActionIds = Core.Assert<
    Core.SameNames<
      Core.PermissionActionId<(typeof actions.reviewWorkflows)[number]>,
      Extract<Core.RegisteredPermissionAction, `admin::review-workflows.${string}`>
    >
  >;
  // `as const` makes the list readonly, and the action provider takes a mutable array.
  await actionProvider.registerMany(
    actions.reviewWorkflows as unknown as Parameters<typeof actionProvider.registerMany>[0]
  );

  // Webhooks and events
  await registerWebhookEvents();

  // Absent in CE, without the audit-logs license, or when disabled by config
  if (strapi.has('audit-logs-lifecycle')) {
    registerAuditEvents({ strapi }, strapi.get('audit-logs-lifecycle'));
  }
  await getService('workflow-weekly-metrics').registerCron();

  // Data initialization
  await initDefaultWorkflow();

  // Document service middleware
  const docsMiddlewares = getService('document-service-middlewares');
  strapi.documents.use(docsMiddlewares.assignStageOnCreate);
  strapi.documents.use(docsMiddlewares.handleStageOnUpdate);
  strapi.documents.use(docsMiddlewares.checkStageBeforePublish);
};
