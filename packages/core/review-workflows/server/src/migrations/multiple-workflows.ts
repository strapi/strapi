import { get, keys, pickBy, pipe } from 'lodash/fp';
import { WORKFLOW_MODEL_UID } from '../constants/workflows';

async function migrateWorkflowsContentTypes({ oldContentTypes, contentTypes }: any) {
  // Look for RW contentTypes attribute
  const hadContentTypes = !!oldContentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.contentTypes;
  const hasContentTypes = !!contentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.contentTypes;

  if (!hadContentTypes && hasContentTypes) {
    // Initialize contentTypes with an empty array and assign only to one
    // workflow the Content Types which were using Review Workflow before.
    await strapi.db.query(WORKFLOW_MODEL_UID).updateMany({ data: { contentTypes: [] } });

    // Find Content Types which were using Review Workflow before
    const contentTypes = pipe([pickBy(get('options.reviewWorkflows')), keys])(oldContentTypes);

    if (contentTypes.length) {
      // Update only one workflow with the contentTypes
      // Before this release there was only one workflow, so this operation is safe.
      await strapi.db
        .query(WORKFLOW_MODEL_UID)
        .update({ where: { id: { $notNull: true } }, data: { contentTypes } });
    }
  }
}

export default migrateWorkflowsContentTypes;
