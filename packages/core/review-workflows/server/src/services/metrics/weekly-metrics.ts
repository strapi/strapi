import type { Core } from '@strapi/types';
import { flow, map, sum, size, mean, max, defaultTo } from 'lodash/fp';
import { add } from 'date-fns';
import { getService } from '../../utils';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const getWeeklyCronScheduleAt = (date: Date) =>
  `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} * * ${date.getDay()}`;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const metrics = getService('workflow-metrics', { strapi });
  const workflowsService = getService('workflows', { strapi });

  const getMetricsStoreValue = async () => {
    const value = await strapi.store.get({ type: 'plugin', name: 'ee', key: 'metrics' });
    return defaultTo({}, value);
  };

  const setMetricsStoreValue = (value: unknown) =>
    strapi.store.set({ type: 'plugin', name: 'ee', key: 'metrics', value });

  return {
    async computeMetrics() {
      // There will never be more than 200 workflow, so we can safely fetch them all
      const workflows = await workflowsService.find({ populate: 'stages' });

      const stagesCount = flow(
        map('stages'), // Number of stages per workflow
        map(size)
      )(workflows);

      const contentTypesCount = flow(
        map('contentTypes'), // Number of content types per workflow
        map(size)
      )(workflows);

      return {
        numberOfActiveWorkflows: size(workflows),
        avgStagesCount: mean(stagesCount),
        maxStagesCount: max(stagesCount),
        activatedContentTypes: sum(contentTypesCount),
      };
    },

    async sendMetrics() {
      const computedMetrics = await this.computeMetrics();
      metrics.sendDidSendReviewWorkflowPropertiesOnceAWeek(computedMetrics);

      const metricsInfoStored = await getMetricsStoreValue();
      // @ts-expect-error metricsInfoStored can use spread
      await setMetricsStoreValue({ ...metricsInfoStored, lastWeeklyUpdate: new Date().getTime() });
    },

    async ensureWeeklyStoredCronSchedule() {
      const metricsInfoStored: any = await getMetricsStoreValue();
      const { weeklySchedule: currentSchedule, lastWeeklyUpdate } = metricsInfoStored;

      const now = new Date();
      let weeklySchedule = currentSchedule;

      if (!currentSchedule || !lastWeeklyUpdate || lastWeeklyUpdate + ONE_WEEK < now.getTime()) {
        weeklySchedule = getWeeklyCronScheduleAt(add(now, { seconds: 10 }));
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
