'use strict';

const { getService } = require('../../utils');

/**
 * Map every stage in the array to be ordered in the relation
 * @param {Object[]} stages
 * @param {number} stages.id
 * @return {Object[]}
 */
function buildStagesConnectArray(stages) {
  return stages.map((stage, index) => {
    const connect = {
      id: stage.id,
      position: {},
    };

    if (index === 0) {
      connect.position.start = true;
    } else {
      connect.position.after = stages[index - 1].id;
    }
    return connect;
  });
}

module.exports = ({ strapi }) => {
  const workflowsService = getService('workflows', { strapi });
  const stagesService = getService('stages', { strapi });

  return {
    async bootstrap() {
      const wfCount = await workflowsService.count();
      const stagesCount = await stagesService.count();

      // Check if there is nothing about review-workflow in DB
      // If any, the feature has already been initialized with a workflow and stages
      if (wfCount === 0 && stagesCount === 0) {
        const defaultStages = require('../../constants/default-stages.json');
        const defaultWorkflow = require('../../constants/default-workflow.json');

        const stages = await stagesService.createMany(defaultStages, { fields: ['id'] });
        const workflow = {
          ...defaultWorkflow,
          stages: {
            connect: buildStagesConnectArray(stages),
          },
        };

        await workflowsService.create(workflow);
      }
    },
  };
};
