'use strict';

const { hasRWEnabled } = require('../../utils/review-workflows');
const { WORKFLOW_MODEL_UID, ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');

// TODO refactor shared logic between packages/core/admin/ee/server/services/review-workflows/review-workflows.js
const assignEntityDefaultStage = async (uid, entityID) => {
  const defaultWorkflow = await strapi.query(WORKFLOW_MODEL_UID).findOne({ populate: ['stages'] });
  if (!defaultWorkflow) {
    return;
  }

  const firstStage = defaultWorkflow.stages[0];

  const contentTypeMetadata = strapi.db.metadata.get(uid);
  const { target, morphBy } = contentTypeMetadata.attributes[ENTITY_STAGE_ATTRIBUTE];
  const { joinTable } = strapi.db.metadata.get(target).attributes[morphBy];
  const { idColumn, typeColumn } = joinTable.morphColumn;

  const connection = strapi.db.getConnection();

  // TODO test all db types
  // Insert rows for all entries of the content type that do not have a
  // default stage
  await connection(joinTable.name).insert({
    [idColumn.name]: entityID,
    field: connection.raw('?', [ENTITY_STAGE_ATTRIBUTE]),
    order: 1,
    [joinTable.joinColumn.name]: firstStage.id,
    [typeColumn.name]: connection.raw('?', [uid]),
  });
};

/**
 * Decorates the entity service with RW business logic
 * @param {object} service - entity service
 */
const decorator = (service) => ({
  async create(uid, opts = {}) {
    const model = strapi.getModel(uid);

    const hasRW = hasRWEnabled(model);

    const entity = await service.create.call(this, uid, opts);
    if (!hasRW) {
      return;
    }

    // Assign this entity to the default workflow stage
    await assignEntityDefaultStage(uid, entity.id);

    return entity;
  },
});

module.exports = () => ({
  decorator,
});
