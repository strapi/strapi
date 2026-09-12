import type { Core } from '@strapi/types';

import { registerApiTokenIntegration } from './api-tokens';
import { registerBackgroundJobIntegration } from './background-jobs';
import { registerReviewWorkflowIntegration } from './review-workflows';
import { registerWebhookIntegration } from './webhooks';

/**
 * The features that need more than row filtering to behave per space.
 *
 * Most of Strapi needs nothing from this file: once a model carries a space,
 * the query scope narrows it wherever it is read. What is collected here is the
 * remainder — the places where work is done for a space by something that is
 * not a request, or where an identity carries a space of its own.
 */
export const registerIntegrations = (strapi: Core.Strapi) => {
  registerApiTokenIntegration(strapi);
  registerBackgroundJobIntegration(strapi);
  registerReviewWorkflowIntegration(strapi);
  registerWebhookIntegration(strapi);
};
