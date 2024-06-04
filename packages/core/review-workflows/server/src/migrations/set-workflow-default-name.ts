import { WORKFLOW_MODEL_UID } from '../constants/workflows';
import defaultWorkflow from '../constants/default-workflow.json';

/**
 * Multiple workflows introduced the ability to name a workflow.
 * This migration adds the default workflow name if the name attribute was added.
 */
async function migrateReviewWorkflowName({ oldContentTypes, contentTypes }: any) {
  // Look for RW name attribute
  const hadName = !!oldContentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.name;
  const hasName = !!contentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.name;

  // Add the default workflow name if name attribute was added
  if (!hadName && hasName) {
    await strapi.db.query(WORKFLOW_MODEL_UID).updateMany({
      where: {
        name: { $null: true },
      },
      data: {
        name: defaultWorkflow.name,
      },
    });
  }
}

export default migrateReviewWorkflowName;
