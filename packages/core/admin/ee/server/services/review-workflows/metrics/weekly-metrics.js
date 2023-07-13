'use strict';

const { defaultTo } = require('lodash/fp');
const { add } = require('date-fns');

const { ONE_WEEK, getWeeklyCronScheduleAt } = require('@strapi/utils').cron;
const { getService } = require('../../../../../server/utils');

const getMetricsStoreValue = async () => {
  const value = await strapi.store.get({ type: 'plugin', name: 'ee', key: 'metrics' });
  return defaultTo({}, value);
};
const setMetricsStoreValue = (value) =>
  strapi.store.set({ type: 'plugin', name: 'ee', key: 'metrics', value });

module.exports = ({ strapi }) => {
  const metrics = getService('review-workflows-metrics', { strapi });

  return {
    async computeMetrics() {
      /*
        TODO: compute metrics
        numberOfActiveWorkflows,
        activatedContentTypes
      */
    },

    async sendMetrics() {
      metrics.sendDidSendReviewWorkflowPropertiesOnceAWeek();

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
  };
};
