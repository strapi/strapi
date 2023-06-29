'use strict';

const { ValidationError } = require('@strapi/utils').errors;
const { getService } = require('../../utils');
const { ERRORS, MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } = require('../../constants/workflows');
const { clampMaxWorkflows, clampMaxStagesPerWorkflow } = require('../../utils/review-workflows');

module.exports = ({ strapi }) => {
  const limits = {
    workflows: MAX_WORKFLOWS,
    stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
  };

  return {
    register({ workflows, stagesPerWorkflow }) {
      if (!Object.isFrozen(limits)) {
        limits.workflows = clampMaxWorkflows(workflows || limits.workflows);
        limits.stagesPerWorkflow = clampMaxStagesPerWorkflow(
          stagesPerWorkflow || limits.stagesPerWorkflow
        );
        Object.freeze(limits);
      }
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
      if (stages.length > limits.stagesPerWorkflow) {
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
      if (countWorkflows + countAddedWorkflows > limits.workflows) {
        throw new ValidationError(ERRORS.WORKFLOWS_LIMIT);
      }
    },
  };
};
