'use strict';

const { WORKFLOW_MODEL_UID, STAGE_MODEL_UID } = require('../../constants/workflows');

module.exports = ({ strapi }) => ({
  async bootstrap() {
    const wfCount = await strapi.entityService.count(WORKFLOW_MODEL_UID);
    const stagesCount = await strapi.entityService.count(STAGE_MODEL_UID);

    if (wfCount + stagesCount === 0) {
      const defaultStages = require('../../constants/default-stages.json');
      const defaultWorkflow = require('../../constants/default-workflow.json');

      await strapi.query('admin::workflow-stage').createMany({ data: defaultStages });

      const stages = await strapi
        .query('admin::workflow-stage')
        .findMany({ limit: 3, select: ['id'] });

      const workflow = {
        ...defaultWorkflow,
        stages: {
          connect: [
            {
              id: stages[0].id,
              position: {
                start: true,
              },
            },
            {
              id: stages[1].id,
              position: {
                after: stages[0].id,
              },
            },
            {
              id: stages[2].id,
              position: {
                after: stages[1].id,
              },
            },
            {
              id: stages[3].id,
              position: {
                after: stages[2].id,
              },
            },
          ],
        },
      };
      await strapi.query('admin::workflow').create({ data: workflow });
    }
  },
});
