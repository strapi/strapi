import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { ERRORS, MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } from '../constants/workflows';
import { clampMaxWorkflows, clampMaxStagesPerWorkflow } from '../utils/review-workflows';

const { ValidationError } = errors;

/**
 * Reads a license limit. A missing, zero or non-numeric value keeps the default, so a malformed
 * license never removes the limit.
 */
const toLimit = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  if (typeof parsed !== 'number' || Number.isFinite(parsed) === false || parsed === 0) {
    return fallback;
  }

  return parsed;
};

export default (({ strapi }: { strapi: Core.Strapi }) => {
  return {
    /**
     * Reads the workflow limits from the current license on every call, so a license that the
     * registry replaces after boot (`ee.update`) applies without a restart.
     */
    getLimits() {
      const feature = strapi.ee.features.get('review-workflows');
      const options = typeof feature === 'object' ? feature.options : undefined;

      return {
        numberOfWorkflows: clampMaxWorkflows(toLimit(options?.numberOfWorkflows, MAX_WORKFLOWS)),
        stagesPerWorkflow: clampMaxStagesPerWorkflow(
          toLimit(options?.stagesPerWorkflow, MAX_STAGES_PER_WORKFLOW)
        ),
      };
    },
    /**
     * Validates the stages of a workflow.
     * @param {Array} stages - Array of stages to be validated.
     * @throws {ValidationError} - If the workflow has no stages or exceeds the limit.
     */
    validateWorkflowStages(stages) {
      if (!stages || stages.length === 0) {
        throw new ValidationError(ERRORS.WORKFLOW_WITHOUT_STAGES);
      }
      if (stages.length > this.getLimits().stagesPerWorkflow) {
        throw new ValidationError(ERRORS.STAGES_LIMIT);
      }
      // Validate stage names are not duplicated
      const stageNames = stages.map((stage: { name: string }) => stage.name);
      if (new Set(stageNames).size !== stageNames.length) {
        throw new ValidationError(ERRORS.DUPLICATED_STAGE_NAME);
      }
    },

    async validateWorkflowCountStages(workflowId, countAddedStages: number = 0) {
      const stagesService = getService('stages', { strapi });
      const countWorkflowStages = await stagesService.count({ workflowId });

      if (countWorkflowStages + countAddedStages > this.getLimits().stagesPerWorkflow) {
        throw new ValidationError(ERRORS.STAGES_LIMIT);
      }
    },

    /**
     * Validates the count of existing and added workflows.
     * @param {number} [countAddedWorkflows=0] - The count of workflows to be added.
     * @throws {ValidationError} - If the total count of workflows exceeds the limit.
     * @returns {Promise<void>} - A Promise that resolves when the validation is completed.
     */
    async validateWorkflowCount(countAddedWorkflows: number = 0) {
      const workflowsService = getService('workflows', { strapi });
      const countWorkflows = await workflowsService.count();
      if (countWorkflows + countAddedWorkflows > this.getLimits().numberOfWorkflows) {
        throw new ValidationError(ERRORS.WORKFLOWS_LIMIT);
      }
    },
  };
}) satisfies Core.ServiceImplementation<'plugin::review-workflows.validation'>;
