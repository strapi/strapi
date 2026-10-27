import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { findRuleConflicts } from '../domain/workflow';
import { normalizeSettings } from '../services/settings';
import { getService } from '../utils';

export const createSettingsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const reviewWorkflows = getService(strapi, 'reviewWorkflows');

    ctx.body = {
      data: {
        settings: await getService(strapi, 'settings').get(),
        reviewWorkflowsEnabled: reviewWorkflows.isEnabled(),
        workflows: await reviewWorkflows.listWorkflows(),
      },
    };
  },

  async update(ctx: Context) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    if (
      body.requireReviewBeforePublish !== undefined &&
      typeof body.requireReviewBeforePublish !== 'boolean'
    ) {
      throw new errors.ValidationError('"requireReviewBeforePublish" must be a boolean');
    }

    const isPlainObject = (value: unknown): value is Record<string, unknown> =>
      value !== null && typeof value === 'object' && !Array.isArray(value);

    if (body.workflows !== undefined) {
      if (!isPlainObject(body.workflows)) {
        throw new errors.ValidationError('"workflows" must be an object keyed by workflow id');
      }

      for (const rules of Object.values(body.workflows)) {
        const values = isPlainObject(rules) ? Object.values(rules) : [null, 'invalid'];

        if (
          values.some(
            (value) => value !== null && !(Number.isInteger(value) && (value as number) > 0)
          )
        ) {
          throw new errors.ValidationError('Stage ids must be positive integers, or null');
        }
      }
    }

    const settings = normalizeSettings(body);
    const saved = await getService(strapi, 'settings').get();
    const workflows = await getService(strapi, 'reviewWorkflows').listWorkflows();
    const existingStageIds = new Set(workflows.flatMap((item) => item.stages.map(({ id }) => id)));

    // Rules may only point at stages of their own workflow
    for (const [workflowId, rules] of Object.entries(settings.workflows)) {
      const workflow = workflows.find((item) => item.id === workflowId);
      const savedRules = saved.workflows[workflowId];

      // The page sends back what it loaded: rules saved for a workflow or a stage deleted
      // since then are dropped, so the page stays savable. Other unknown ids are refused.
      if (workflow === undefined) {
        if (savedRules === undefined) {
          throw new errors.ValidationError(`Unknown workflow ${workflowId}`);
        }

        delete settings.workflows[workflowId];
        continue;
      }

      (Object.keys(rules) as Array<keyof typeof rules>).forEach((rule) => {
        if (
          rules[rule] !== null &&
          !existingStageIds.has(rules[rule] as number) &&
          savedRules?.[rule] === rules[rule]
        ) {
          rules[rule] = null;
        }
      });

      const stageIds = new Set(workflow.stages.map((stage) => stage.id));
      const invalid = Object.entries(rules).filter(
        ([, stageId]) => stageId !== null && !stageIds.has(stageId)
      );

      if (invalid.length > 0) {
        throw new errors.ValidationError(
          `Stages that do not belong to workflow "${workflow.name}": ${invalid.map(([rule]) => rule).join(', ')}`
        );
      }

      const conflicts = findRuleConflicts(rules);

      if (conflicts.length > 0) {
        throw new errors.ValidationError(`Workflow "${workflow.name}": ${conflicts.join('. ')}`);
      }
    }

    ctx.body = { data: { settings: await getService(strapi, 'settings').set(settings) } };
  },
});
