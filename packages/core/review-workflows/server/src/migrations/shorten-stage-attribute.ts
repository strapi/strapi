import semver from 'semver';
import { getOr } from 'lodash/fp';
import { async } from '@strapi/utils';
import { STAGE_MODEL_UID } from '../constants/workflows';

function checkVersionThreshold(
  startVersion: string,
  currentVersion: string,
  thresholdVersion: string
) {
  return semver.gte(currentVersion, thresholdVersion) && semver.lt(startVersion, thresholdVersion);
}

/**
 * Shorten strapi stage name
 */
async function migrateStageAttribute({ oldContentTypes, contentTypes }: any) {
  const getRWVersion = getOr('0.0.0', `${STAGE_MODEL_UID}.options.version`);
  const oldRWVersion = getRWVersion(oldContentTypes);
  const currentRWVersion = getRWVersion(contentTypes);

  const migrationNeeded = checkVersionThreshold(oldRWVersion, currentRWVersion, '1.1.0');

  // TODO: Find tables with something else than `findTables` function
  // if (migrationNeeded) {
  //   const oldAttributeTableName = 'strapi_review_workflows_stage';
  //   const newAttributeTableName = 'strapi_stage';
  //   // const tables = await findTables({ strapi }, new RegExp(oldAttributeTableName));

  //   await async.map(tables, async (tableName: string) => {
  //     const newTableName = tableName.replace(oldAttributeTableName, newAttributeTableName);
  //     const alreadyHasNextTable = await strapi.db.connection.schema.hasTable(newTableName);

  //     // The table can be already created but empty. In order to rename the old one, we need to drop the previously created empty one.
  //     if (alreadyHasNextTable) {
  //       const dataInTable = await strapi.db.connection(newTableName).select().limit(1);
  //       if (!dataInTable.length) {
  //         await strapi.db.connection.schema.dropTable(newTableName);
  //       }
  //     }

  //     try {
  //       await strapi.db.connection.schema.renameTable(tableName, newTableName);
  //     } catch (e: any) {
  //       strapi.log.warn(
  //         `An error occurred during the migration of ${tableName} table to ${newTableName}.\nIf ${newTableName} already exists, migration can't be done automatically.`
  //       );
  //       strapi.log.warn(e.message);
  //     }
  //   });
  // }
}

export default migrateStageAttribute;
