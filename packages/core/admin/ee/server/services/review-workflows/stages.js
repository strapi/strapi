'use strict';

const {
  mapAsync,
  reduceAsync,
  errors: { ApplicationError, ValidationError },
} = require('@strapi/utils');
const { map, pick, isEqual } = require('lodash/fp');

const { STAGE_MODEL_UID, ENTITY_STAGE_ATTRIBUTE, ERRORS } = require('../../constants/workflows');
const { getService } = require('../../utils');

const sanitizedStageFields = ['id', 'name', 'workflow', 'color'];
const sanitizeStageFields = pick(sanitizedStageFields);

module.exports = ({ strapi }) => {
  const metrics = getService('review-workflows-metrics', { strapi });
  const stagePermissionsService = getService('stage-permissions', { strapi });
  const workflowsValidationService = getService('review-workflows-validation', { strapi });

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

    async createMany(stagesList, { fields } = {}) {
      const params = { select: fields ?? '*' };

      // TODO: pick the fields from the stage
      const stages = await Promise.all(
        stagesList.map((stage) =>
          strapi.entityService.create(STAGE_MODEL_UID, {
            data: sanitizeStageFields(stage),
            ...params,
          })
        )
      );

      // Create stage permissions
      await reduceAsync(stagesList)(async (_, stage, idx) => {
        // Ignore stages without permissions
        if (!stage.permissions || stage.permissions.length === 0) {
          return;
        }

        const stagePermissions = stage.permissions;
        const stageId = stages[idx].id;

        const permissions = await mapAsync(
          stagePermissions,
          // Register each stage permission
          (permission) =>
            stagePermissionsService.register({
              roleId: permission.role,
              action: permission.action,
              fromStage: stageId,
            })
        );

        // Update stage with the new permissions
        await strapi.entityService.update(STAGE_MODEL_UID, stageId, {
          data: {
            permissions: permissions.flat().map((p) => p.id),
          },
        });
      }, []);

      metrics.sendDidCreateStage();

      return stages;
    },

    async update(srcStage, destStage) {
      let stagePermissions = srcStage?.permissions ?? [];
      const stageId = destStage.id;

      if (destStage.permissions) {
        await this.deleteStagePermissions([srcStage]);

        const permissions = await mapAsync(destStage.permissions, (permission) =>
          stagePermissionsService.register({
            roleId: permission.role,
            action: permission.action,
            fromStage: stageId,
          })
        );
        stagePermissions = permissions.flat().map((p) => p.id);
      }

      const stage = await strapi.entityService.update(STAGE_MODEL_UID, stageId, {
        data: {
          ...destStage,
          permissions: stagePermissions,
        },
      });

      metrics.sendDidEditStage();

      return stage;
    },

    async delete(stage) {
      // Unregister all permissions related to this stage id
      await this.deleteStagePermissions([stage]);

      const deletedStage = await strapi.entityService.delete(STAGE_MODEL_UID, stage.id);

      metrics.sendDidDeleteStage();

      return deletedStage;
    },

    async deleteMany(stages) {
      await this.deleteStagePermissions(stages);

      return strapi.entityService.deleteMany(STAGE_MODEL_UID, {
        filters: { id: { $in: stages.map((s) => s.id) } },
      });
    },

    async deleteStagePermissions(stages) {
      // TODO: Find another way to do this for when we use the "to" parameter.
      const permissions = stages.map((s) => s.permissions || []).flat();
      await stagePermissionsService.unregister(permissions || []);
    },

    count({ workflowId } = {}) {
      const opts = {};

      if (workflowId) {
        opts.where = {
          workflow: workflowId,
        };
      }
      return strapi.entityService.count(STAGE_MODEL_UID, opts);
    },

    async replaceStages(srcStages, destStages, contentTypesToMigrate = []) {
      const { created, updated, deleted } = getDiffBetweenStages(srcStages, destStages);

      assertAtLeastOneStageRemain(srcStages || [], { created, deleted });

      // Update stages and assign entity stages
      return strapi.db.transaction(async ({ trx }) => {
        // Create the new stages
        const createdStages = await this.createMany(created, { fields: ['id'] });
        // Put all the newly created stages ids
        const createdStagesIds = map('id', createdStages);

        // Update the workflow stages
        await mapAsync(updated, (destStage) => {
          const srcStage = srcStages.find((s) => s.id === destStage.id);

          return this.update(srcStage, destStage);
        });

        // Delete the stages that are not in the new stages list
        await mapAsync(deleted, async (stage) => {
          // Find the nearest stage in the workflow and newly created stages
          // that is not deleted, prioritizing the previous stages
          const nearestStage = findNearestMatchingStage(
            [...srcStages, ...createdStages],
            srcStages.findIndex((s) => s.id === stage.id),
            (targetStage) => {
              return !deleted.find((s) => s.id === targetStage.id);
            }
          );

          // Assign the new stage to entities that had the deleted stage
          await mapAsync(contentTypesToMigrate, (contentTypeUID) => {
            this.updateEntitiesStage(contentTypeUID, {
              fromStageId: stage.id,
              toStageId: nearestStage.id,
              trx,
            });
          });

          return this.delete(stage);
        });

        return destStages.map((stage) => ({ ...stage, id: stage.id ?? createdStagesIds.shift() }));
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

      await workflowsValidationService.validateWorkflowCount();

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
     * Updates entity stages of a content type:
     *  - If fromStageId is undefined, all entities with an existing stage will be assigned the new stage
     *  - If fromStageId is null, all entities without a stage will be assigned the new stage
     *  - If fromStageId is a number, all entities with that stage will be assigned the new stage
     *
     * For performance reasons we use knex queries directly.
     *
     * @param {string} contentTypeUID
     * @param {number | undefined | null} fromStageId
     * @param {number} toStageId
     * @param {import('knex').Knex.Transaction} trx
     * @returns
     */
    async updateEntitiesStage(contentTypeUID, { fromStageId, toStageId }) {
      const { attributes, tableName } = strapi.db.metadata.get(contentTypeUID);
      const joinTable = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable;
      const joinColumn = joinTable.joinColumn.name;
      const invJoinColumn = joinTable.inverseJoinColumn.name;

      await workflowsValidationService.validateWorkflowCount();

      return strapi.db.transaction(async ({ trx }) => {
        // Update all already existing links to the new stage
        if (fromStageId === undefined) {
          return strapi.db
            .getConnection()
            .from(joinTable.name)
            .update({ [invJoinColumn]: toStageId })
            .transacting(trx);
        }

        // Update all links from the specified stage to the new stage
        const selectStatement = strapi.db
          .getConnection()
          .select({ [joinColumn]: 't1.id', [invJoinColumn]: toStageId })
          .from(`${tableName} as t1`)
          .leftJoin(`${joinTable.name} as t2`, `t1.id`, `t2.${joinColumn}`)
          .where(`t2.${invJoinColumn}`, fromStageId)
          .toSQL();

        // Insert rows for all entries of the content type that have the specified stage
        return strapi.db
          .getConnection(joinTable.name)
          .insert(
            strapi.db.connection.raw(
              `(${joinColumn}, ${invJoinColumn})  ${selectStatement.sql}`,
              selectStatement.bindings
            )
          )
          .transacting(trx);
      });
    },

    /**
     * Deletes all entity stages of a content type
     * @param {string} contentTypeUID
     * @returns
     */
    async deleteAllEntitiesStage(contentTypeUID) {
      const { attributes } = strapi.db.metadata.get(contentTypeUID);
      const joinTable = attributes[ENTITY_STAGE_ATTRIBUTE].joinTable;

      // Delete all stage links for the content type
      return strapi.db.transaction(async ({ trx }) =>
        strapi.db.getConnection().from(joinTable.name).delete().transacting(trx)
      );
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
    // ...

    (acc, stageToCompare) => {
      const srcStage = sourceStages.find((stage) => stage.id === stageToCompare.id);

      if (!srcStage) {
        acc.created.push(stageToCompare);
      } else if (
        !isEqual(
          pick(['name', 'color', 'permissions'], srcStage),
          pick(['name', 'color', 'permissions'], stageToCompare)
        )
      ) {
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
 * @throws {ValidationError} If the number of remaining stages in the workflow after applying deletions and additions is less than 1.
 */
function assertAtLeastOneStageRemain(workflowStages, diffStages) {
  const remainingStagesCount =
    workflowStages.length - diffStages.deleted.length + diffStages.created.length;
  if (remainingStagesCount < 1) {
    throw new ValidationError(ERRORS.WORKFLOW_WITHOUT_STAGES);
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
