'use strict';

const { scheduleJob } = require('node-schedule');
const { FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../constants');

const rand = max => Math.floor(Math.random() * max);
const getCronRandomHour = () => `${rand(60)} ${rand(60)} ${rand(24)} ${rand(7)} * *`;

module.exports = ({ strapi }) => {
  const crons = [];
  let started = false;

  return {
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
      const folderLevelsArray = (
        await knex(folderTable)
          .select(
            knex.raw(
              `LENGTH(${keepOnlySlashesSQLString}) as depth, count(*) as occurence`,
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
      const averageDepth = product / folderNumber;

      let sumOfDeviation = 0;
      for (const folderLevel of folderLevelsArray) {
        sumOfDeviation += Math.abs(folderLevel.depth * folderLevel.occurence - averageDepth);
      }
      const averageDeviationDepth = sumOfDeviation / folderNumber;

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

    async startRegularMetricsUpdate() {
      if (started) {
        throw new Error('Upload metrics already started');
      }
      started = true;

      const pingCron = scheduleJob(getCronRandomHour(), async () => {
        const metrics = await this.computeMetrics();
        strapi.telemetry.send('mediaLibraryMetrics', metrics);
      });

      crons.push(pingCron);
    },

    destroy() {
      crons.forEach(cron => cron.cancel());
    },
  };
};
