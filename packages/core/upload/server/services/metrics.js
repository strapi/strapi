'use strict';

const { defaultTo } = require('lodash/fp');
const { add } = require('date-fns');
const { FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../constants');
const { getWeeklyCronScheduleAt } = require('../utils/cron');

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const getMetricsStoreValue = async () => {
  const value = await strapi.store.get({ type: 'plugin', name: 'upload', key: 'metrics' });
  return defaultTo({}, value);
};
const setMetricsStoreValue = value =>
  strapi.store.set({ type: 'plugin', name: 'upload', key: 'metrics', value });

module.exports = ({ strapi }) => ({
  async computeMetrics() {
    // Folder metrics
    const pathColName = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.path.columnName;
    const folderTable = strapi.getModel(FOLDER_MODEL_UID).collectionName;

    let keepOnlySlashesSQLString = '??';
    let queryParams = [pathColName];
    for (let i = 0; i < 10; i += 1) {
      keepOnlySlashesSQLString = `REPLACE(${keepOnlySlashesSQLString}, ?, ?)`;
      queryParams.push(String(i), '');
    }

    const knex = strapi.db.connection;

    /*
      The following query goal is to count the number of folders with depth 1, depth 2 etc.
      The query returns :
      [
        { depth: 1, occurence: 4 },
        { depth: 2, occurence: 2 },
        { depth: 3, occurence: 5 },
      ]

      The query is built as follow:
      1. In order to get the depth level of a folder:
        - we take their path
        - remove all numbers (by replacing 0123456789 by '', thus the 10 REPLACE in the query)
        - count the remaining `/`, which correspond to their depth (by using LENGTH)
        We now have, for each folder, its depth.
      2. In order to get the number of folders for each depth:
        - we group them by their depth and use COUNT(*)
    */

    const folderLevelsArray = (
      await knex(folderTable)
        .select(
          knex.raw(
            `LENGTH(${keepOnlySlashesSQLString}) AS depth, COUNT(*) AS occurence`,
            queryParams
          )
        )
        .groupBy('depth')
    ).map(map => ({ depth: Number(map.depth), occurence: Number(map.occurence) })); // values can be strings depending on the database

    let product = 0;
    let folderNumber = 0;
    let maxDepth = 0;
    for (const folderLevel of folderLevelsArray) {
      product += folderLevel.depth * folderLevel.occurence;
      folderNumber += folderLevel.occurence;
      if (folderLevel.depth > maxDepth) {
        maxDepth = folderLevel.depth;
      }
    }
    const averageDepth = folderNumber !== 0 ? product / folderNumber : 0;

    let sumOfDeviation = 0;
    for (const folderLevel of folderLevelsArray) {
      sumOfDeviation += Math.abs(folderLevel.depth - averageDepth) * folderLevel.occurence;
    }

    const averageDeviationDepth = folderNumber !== 0 ? sumOfDeviation / folderNumber : 0;

    // File metrics
    const assetNumber = await strapi.entityService.count(FILE_MODEL_UID);

    return {
      assetNumber,
      folderNumber,
      averageDepth,
      maxDepth,
      averageDeviationDepth,
    };
  },

  async sendMetrics() {
    const metrics = await this.computeMetrics();
    strapi.telemetry.send('didSendUploadPropertiesOnceAWeek', metrics);

    const metricsInfoStored = await getMetricsStoreValue();
    await setMetricsStoreValue({ ...metricsInfoStored, lastWeeklyUpdate: new Date().getTime() });
  },

  async ensureWeeklyStoredCronSchedule() {
    const metricsInfoStored = await getMetricsStoreValue();
    const { weeklySchedule: currentSchedule, lastWeeklyUpdate } = metricsInfoStored;

    const now = new Date();
    let weeklySchedule = currentSchedule;

    if (!currentSchedule || !lastWeeklyUpdate || lastWeeklyUpdate + ONE_WEEK < now.getTime()) {
      weeklySchedule = getWeeklyCronScheduleAt(add(now, { minutes: 5 }));
      await setMetricsStoreValue({ ...metricsInfoStored, weeklySchedule });
    }

    return weeklySchedule;
  },

  async registerCron() {
    const weeklySchedule = await this.ensureWeeklyStoredCronSchedule();

    strapi.cron.add({ [weeklySchedule]: this.sendMetrics.bind(this) });
  },
});
