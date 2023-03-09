'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');
const { mapAsync } = require('@strapi/utils');
const executeCEBootstrap = require('../../server/bootstrap');
const { getService } = require('../../server/utils');
const actions = require('./config/admin-actions');
const {
  createReservedTable,
  findTablesThatStartWithPrefix,
  doesReservedTableEntryExist,
  createReservedTableEntries,
} = require('./utils/reserved-tables');

module.exports = async ({ strapi }) => {
  const connection = strapi.db.getSchemaConnection();
  await createReservedTable(connection);

  const tablesToPersist = [];

  const { actionProvider } = getService('permission');

  if (features.isEnabled('sso')) {
    await actionProvider.registerMany(actions.sso);
  }

  if (features.isEnabled('audit-logs')) {
    const auditLogTables = await findTablesThatStartWithPrefix('strapi_audit_logs');
    tablesToPersist.push(...auditLogTables);

    await actionProvider.registerMany(actions.auditLogs);
  }

  if (features.isEnabled('review-workflows')) {
    const reviewWorkflowTables = await findTablesThatStartWithPrefix('strapi_workflows');
    tablesToPersist.push(...reviewWorkflowTables);
  }

  let recordsToInsert = await mapAsync(tablesToPersist, (tableName) =>
    doesReservedTableEntryExist(tableName)
  );
  recordsToInsert = recordsToInsert.filter((record) => record);

  if (recordsToInsert.length > 0) {
    await createReservedTableEntries(recordsToInsert);
  }

  await getService('seat-enforcement').seatEnforcementWorkflow();

  await executeCEBootstrap();
};
