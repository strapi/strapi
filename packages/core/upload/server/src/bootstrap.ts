import type { Core } from '@strapi/types';

import { getService } from './utils';
import { ALLOWED_SORT_STRINGS, ALLOWED_WEBHOOK_EVENTS } from './constants';
import { notifyMediaLibraryDefault } from './media-library-default-notice';
import { registerAuditEvents } from './audit-logs';

export async function bootstrap({ strapi }: { strapi: Core.Strapi }) {
  const defaultConfig = {
    settings: {
      sizeOptimization: true,
      responsiveDimensions: true,
      autoOrientation: false,
      aiMetadata: true,
    },
    view_configuration: {
      pageSize: 10,
      sort: ALLOWED_SORT_STRINGS[0],
    },
  };

  // Whether this plugin has stored settings from an earlier boot, which is what separates
  // an upgrading app from a fresh install for the Media Library default notice below.
  let isExistingApp = false;

  for (const [key, defaultValue] of Object.entries(defaultConfig)) {
    // set plugin store
    const configurator = strapi.store!({ type: 'plugin', name: 'upload', key });

    const config = await configurator.get({});

    if (config) {
      isExistingApp = true;
    }
    if (
      config &&
      Object.keys(defaultValue).every((key) => Object.prototype.hasOwnProperty.call(config, key))
    ) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // if the config does not exist or does not have all the required keys
    // set from the defaultValue ensuring all required settings are present
    await configurator.set({
      value: Object.assign(defaultValue, config || {}),
    });
  }

  await notifyMediaLibraryDefault({ strapi, isExistingApp });

  await registerPermissionActions();
  await registerWebhookEvents();

  if (strapi.has('audit-logs-lifecycle')) {
    registerAuditEvents(strapi.get('audit-logs-lifecycle'));
  }

  await getService('weeklyMetrics').registerCron();

  // AI metadata
  failInterruptedAIMetadataJobsOnListen(strapi);

  if (strapi.ai.admin.isAvailable()) {
    const aiMetadataProvider = getService('aiMetadataProvider');

    if (!aiMetadataProvider.hasProvider() && strapi.ai.admin.isStrapiManagedAiEnabled()) {
      aiMetadataProvider.registerStrapiManagedProvider();
    }
  }

  getService('metrics').sendUploadPluginMetrics();

  getService('extensions').signFileUrlsOnDocumentService();
}

/**
 * A job runs inside the server process that created it, and that process writes the job's
 * heartbeat at an interval. A job still `processing` with a stale or missing heartbeat was cut
 * off by a stop or crash of its server, so a server that starts listening fails it. A job that
 * another server on the same database still runs has a fresh heartbeat and is left alone.
 * After a crash, a server that restarts at once finds the heartbeat still fresh: the job is then
 * failed once the heartbeat goes stale, about two minutes later, by the sweep that runs on each
 * `GET /upload/ai-metadata-jobs/latest`. A clean stop fails its own jobs at once (see `destroy`).
 * The sweep runs in each process that serves HTTP, `strapi console` included, because console
 * listens too. It waits for `listening` because the other CLI commands (`strapi export`,
 * `strapi import`, `strapi transfer`, `configuration:dump`, ...) also run `bootstrap` but never
 * listen: they never fail a job.
 */
const failInterruptedAIMetadataJobsOnListen = (strapi: Core.Strapi) => {
  strapi.server.httpServer.once('listening', async () => {
    try {
      await getService('aiMetadataJobs').failInterruptedJobs();
    } catch (error) {
      strapi.log.error('Could not fail the AI metadata jobs interrupted by a previous server');
      strapi.log.error(error);
    }
  });
};

const registerWebhookEvents = async () =>
  Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
    strapi.get('webhookStore').addAllowedEvent(key, value);
  });

const registerPermissionActions = async () => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Access the Media Library',
      uid: 'read',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Create (upload)',
      uid: 'assets.create',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Update (crop, details, replace) + delete',
      uid: 'assets.update',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Download',
      uid: 'assets.download',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Copy link',
      uid: 'assets.copy-link',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Configure view',
      uid: 'configure-view',
      pluginName: 'upload',
    },
    {
      section: 'settings',
      displayName: 'Access the Media Library settings page',
      uid: 'settings.read',
      category: 'media library',
      pluginName: 'upload',
    },
  ];

  await strapi.service('admin::permission').actionProvider.registerMany(actions);
};
