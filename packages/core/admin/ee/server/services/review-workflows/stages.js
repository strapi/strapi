'use strict';

const { mapAsync } = require('@strapi/utils');

const { STAGE_MODEL_UID } = require('../../constants/workflows');
const { getService } = require('../../utils');

module.exports = ({ strapi }) => {
  const workflowsService = getService('workflows', { strapi });

  return {
    find({ workflowId, populate }) {
      const params = {
        filters: { workflow: workflowId },
        populate,
      };
      return strapi.entityService.findMany(STAGE_MODEL_UID, params);
    },

    findById(id, { workflowId, populate }) {
      const params = {
        filters: { workflow: workflowId },
        populate,
      };
      return strapi.entityService.findOne(STAGE_MODEL_UID, id, params);
    },

    createMany(stagesList, { fields }) {
      const params = {
        select: fields,
      };
      return Promise.all(
        stagesList.map((stage) =>
          strapi.entityService.create(STAGE_MODEL_UID, { data: stage, ...params })
        )
      );
    },

    update(stageId, stageData) {
      return strapi.entityService.update(STAGE_MODEL_UID, stageId, { data: stageData });
    },

    delete(stageId) {
      return strapi.entityService.delete(STAGE_MODEL_UID, stageId);
    },

    count() {
      return strapi.entityService.count(STAGE_MODEL_UID);
    },

    async replaceWorkflowStages(workflowId, stages) {
      const workflow = await workflowsService.findById(workflowId, { populate: ['stages'] });

      const { created, updated, deleted } = getDiffBetweenStages(workflow.stages, stages);

      return strapi.db.transaction(async () => {
        const newStages = await this.createMany(created, { fields: ['id'] });
        const stagesIds = stages.map((stage) => stage.id ?? newStages.shift().id);

        await mapAsync(updated, (stage) => this.update(stage.id, stage));
        await mapAsync(deleted, (stage) => this.delete(stage.id));
        return workflowsService.update(workflowId, {
          stages: stagesIds,
        });
      });
    },
  };
};

/**
 * Compares two arrays of stages and returns an object indicating the differences.
 * @typedef {{id: Number, name: String, workflow: Number}} Stage
 * @typedef {{created: Stage[], updated: Stage[], deleted: Stage[]}} DiffStages
 *
 * The DiffStages object has three properties: `created`, `updated`, and `deleted`.
 * `created` is an array of stages that are in `comparisonStages` but not in `sourceStages`.
 * `updated` is an array of stages that have different names in `comparisonStages` and `sourceStages`.
 * `deleted` is an array of stages that are in `sourceStages` but not in `comparisonStages`.
 *
 * @param {Stage[]} sourceStages
 * @param {Stage[]} comparisonStages
 * @returns { DiffStages }
 */
function getDiffBetweenStages(sourceStages, comparisonStages) {
  const result = comparisonStages.reduce(
    (acc, stageToCompare) => {
      const srcStage = sourceStages.find((stage) => stage.id === stageToCompare.id);

      if (!srcStage) {
        acc.created.push(stageToCompare);
      } else if (srcStage.name !== stageToCompare.name) {
        acc.updated.push(stageToCompare);
      }
      return acc;
    },
    { created: [], updated: [] }
  );

  result.deleted = sourceStages.filter(
    (srcStage) => !comparisonStages.some((cmpStage) => cmpStage.id === srcStage.id)
  );

  return result;
}
