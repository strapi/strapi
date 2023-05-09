'use strict';

const {
  mapAsync,
  errors: { ApplicationError },
} = require('@strapi/utils');
const { map } = require('lodash/fp');

const { STAGE_MODEL_UID, ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');
const { getService } = require('../../utils');
const { getContentTypeUIDsWithActivatedReviewWorkflows } = require('../../utils/review-workflows');

module.exports = ({ strapi }) => {
  const workflowsService = getService('workflows', { strapi });
  const metrics = getService('review-workflows-metrics', { strapi });

  return {
    find({ workflowId, populate }) {
      const params = {
        filters: { workflow: workflowId },
        populate,
      };
      return strapi.entityService.findMany(STAGE_MODEL_UID, params);
    },

    findById(id, { populate } = {}) {
      const params = {
        populate,
      };
      return strapi.entityService.findOne(STAGE_MODEL_UID, id, params);
    },

    async createMany(stagesList, { fields }) {
      const params = { select: fields };

      const stages = await Promise.all(
        stagesList.map((stage) =>
          strapi.entityService.create(STAGE_MODEL_UID, { data: stage, ...params })
        )
      );

      metrics.sendDidCreateStage();

      return stages;
    },

    async update(stageId, stageData) {
      const stage = await strapi.entityService.update(STAGE_MODEL_UID, stageId, {
        data: stageData,
      });

      metrics.sendDidEditStage();

      return stage;
    },

    async delete(stageId) {
      const stage = await strapi.entityService.delete(STAGE_MODEL_UID, stageId);

      metrics.sendDidDeleteStage();

      return stage;
    },

    count() {
      return strapi.entityService.count(STAGE_MODEL_UID);
    },

    async replaceWorkflowStages(workflowId, stages) {
      const workflow = await workflowsService.findById(workflowId, { populate: ['stages'] });

      const { created, updated, deleted } = getDiffBetweenStages(workflow.stages, stages);

      assertAtLeastOneStageRemain(workflow.stages, { created, deleted });

      return strapi.db.transaction(async ({ trx }) => {
        // Create the new stages
        const createdStages = await this.createMany(created, { fields: ['id'] });
        // Put all the newly created stages ids
        const createdStagesIds = map('id', createdStages);
        const stagesIds = stages.map((stage) => stage.id ?? createdStagesIds.shift());
        const contentTypes = getContentTypeUIDsWithActivatedReviewWorkflows(strapi.contentTypes);

        // Update the workflow stages
        await mapAsync(updated, (stage) => this.update(stage.id, stage));

        // Delete the stages that are not in the new stages list
        await mapAsync(deleted, async (stage) => {
          // Find the nearest stage in the workflow and newly created stages
          // that is not deleted, prioritizing the previous stages
          const nearestStage = findNearestMatchingStage(
            [...workflow.stages, ...createdStages],
            workflow.stages.findIndex((s) => s.id === stage.id),
            (targetStage) => {
              return !deleted.find((s) => s.id === targetStage.id);
            }
          );

          // Assign the new stage to entities that had the deleted stage
          await mapAsync(contentTypes, (contentTypeUID) => {
            this.updateEntitiesStage(contentTypeUID, {
              fromStageId: stage.id,
              toStageId: nearestStage.id,
              trx,
            });
          });

          return this.delete(stage.id);
        });

        return workflowsService.update(workflowId, {
          stages: stagesIds,
        });
      });
    },

    /**
     * Update the stage of an entity
     *
     * @param {object} entityInfo
     * @param {number} entityInfo.id - Entity id
     * @param {string} entityInfo.modelUID - the content-type of the entity
     * @param {number} stageId - The id of the stage to assign to the entity
     */
    async updateEntity(entityInfo, stageId) {
      const stage = await this.findById(stageId);

      if (!stage) {
        throw new ApplicationError(`Selected stage does not exist`);
      }

      const entity = await strapi.entityService.update(entityInfo.modelUID, entityInfo.id, {
        data: { [ENTITY_STAGE_ATTRIBUTE]: stageId },
        populate: [ENTITY_STAGE_ATTRIBUTE],
      });

      metrics.sendDidChangeEntryStage();

      return entity;
    },

    /**
     * Updates the stage of all entities of a content type that are in a specific stage
     * @param {string} contentTypeUID
     * @param {number} fromStageId
     * @param {number} toStageId
     * @param {KnexTransaction} trx
     * @returns
     */
    async updateEntitiesStage(contentTypeUID, { fromStageId, toStageId, trx = null }) {
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID);
      const joinTable = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable;
      const joinColumn = joinTable.joinColumn.name;
      const invJoinColumn = joinTable.inverseJoinColumn.name;

      const selectStatement = strapi.db
        .getConnection()
        .select({ [joinColumn]: 't1.id', [invJoinColumn]: toStageId })
        .from(`${tableName} as t1`)
        .leftJoin(`${joinTable.name} as t2`, `t1.id`, `t2.${joinColumn}`)
        .where(`t2.${invJoinColumn}`, fromStageId)
        .toSQL();

      // Insert rows for all entries of the content type that do not have a
      // default stage
      const query = strapi.db
        .getConnection(joinTable.name)
        .insert(
          strapi.db.connection.raw(
            `(${joinColumn}, ${invJoinColumn})  ${selectStatement.sql}`,
            selectStatement.bindings
          )
        );

      if (trx) {
        query.transacting(trx);
      }

      return query;
    },
  };
};

/**
 * Compares two arrays of stages and returns an object indicating the differences.
 *
 * The function compares the `id` properties of each stage in `sourceStages` and `comparisonStages` to determine if the stage is present in both arrays.
 * If a stage with the same `id` is found in both arrays but the `name` property is different, the stage is considered updated.
 * If a stage with a particular `id` is only found in `comparisonStages`, it is considered created.
 * If a stage with a particular `id` is only found in `sourceStages`, it is considered deleted.
 *
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
      } else if (srcStage.name !== stageToCompare.name || srcStage.color !== stageToCompare.color) {
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

/**
 * Asserts that at least one stage remains in the workflow after applying deletions and additions.
 *
 * @param {Array} workflowStages - An array of stages in the current workflow.
 * @param {Object} diffStages - An object containing the stages to be deleted and created.
 * @param {Array} diffStages.deleted - An array of stages that are planned to be deleted from the workflow.
 * @param {Array} diffStages.created - An array of stages that are planned to be created in the workflow.
 *
 * @throws {ApplicationError} If the number of remaining stages in the workflow after applying deletions and additions is less than 1.
 */
function assertAtLeastOneStageRemain(workflowStages, diffStages) {
  const remainingStagesCount =
    workflowStages.length - diffStages.deleted.length + diffStages.created.length;
  if (remainingStagesCount < 1) {
    throw new ApplicationError('At least one stage must remain in the workflow.');
  }
}

/**
 * Find the id of the nearest object in an array that matches a condition.
 * Used for searching for the nearest stage that is not deleted.
 * Starts by searching the elements before the index, then the remaining elements in the array.
 *
 * @param {Array} stages
 * @param {Number} startIndex the index to start searching from
 * @param {Function} condition must evaluate to true for the object to be considered a match
 * @returns {Object} stage
 */
function findNearestMatchingStage(stages, startIndex, condition) {
  // Start by searching the elements before the startIndex
  for (let i = startIndex; i >= 0; i -= 1) {
    if (condition(stages[i])) {
      return stages[i];
    }
  }

  // If no matching element is found before the startIndex,
  // search the remaining elements in the array
  const remainingArray = stages.slice(startIndex + 1);
  const nearestObject = remainingArray.filter(condition)[0];
  return nearestObject;
}
