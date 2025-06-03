import type { Core } from '@strapi/types';
import { uniq } from 'lodash/fp';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { ERRORS, MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } from '../constants/workflows';
import { clampMaxWorkflows, clampMaxStagesPerWorkflow } from '../utils/review-workflows';

const { ValidationError } = errors;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    limits: {
      numberOfWorkflows: MAX_WORKFLOWS,
      stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
    },
    register({ numberOfWorkflows, stagesPerWorkflow }: any) {
      if (!Object.isFrozen(this.limits)) {
        this.limits.numberOfWorkflows = clampMaxWorkflows(
          numberOfWorkflows || this.limits.numberOfWorkflows
        );
        this.limits.stagesPerWorkflow = clampMaxStagesPerWorkflow(
          stagesPerWorkflow || this.limits.stagesPerWorkflow
        );
        Object.freeze(this.limits);
      }
    },
    /**
     * Validates the stages of a workflow.
     * @param {Array} stages - Array of stages to be validated.
     * @throws {ValidationError} - If the workflow has no stages or exceeds the limit.
     */
    validateWorkflowStages(stages: any) {
      if (!stages || stages.length === 0) {
        throw new ValidationError(ERRORS.WORKFLOW_WITHOUT_STAGES);
      }
      if (stages.length > this.limits.stagesPerWorkflow) {
        throw new ValidationError(ERRORS.STAGES_LIMIT);
      }
      // Validate stage names are not duplicated
      const stageNames = stages.map((stage: any) => stage.name);
      if (uniq(stageNames).length !== stageNames.length) {
        throw new ValidationError(ERRORS.DUPLICATED_STAGE_NAME);
      }
    },

    async validateWorkflowCountStages(workflowId: any, countAddedStages = 0) {
      const stagesService = getService('stages', { strapi });
      const countWorkflowStages = await stagesService.count({ workflowId });

      if (countWorkflowStages + countAddedStages > this.limits.stagesPerWorkflow) {
        throw new ValidationError(ERRORS.STAGES_LIMIT);
      }
    },

    /**
     * Validates the count of existing and added workflows.
     * @param {number} [countAddedWorkflows=0] - The count of workflows to be added.
     * @throws {ValidationError} - If the total count of workflows exceeds the limit.
     * @returns {Promise<void>} - A Promise that resolves when the validation is completed.
     */
    async validateWorkflowCount(countAddedWorkflows = 0) {
      const workflowsService = getService('workflows', { strapi });
      const countWorkflows = await workflowsService.count();
      if (countWorkflows + countAddedWorkflows > this.limits.numberOfWorkflows) {
        throw new ValidationError(ERRORS.WORKFLOWS_LIMIT);
      }
    },
  };
};
