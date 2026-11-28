// Active admin users across all instances of a license: reports them to the license registry,
// stores the count it sends back, and reads it for the admin panel.
import type { Core } from '@strapi/types';
import {
  adminUsersAcrossInstancesSchema,
  reportAdminUsers,
  type AdminUsersAcrossInstances,
} from './license';
import { getUserHashes } from './user-hashes';

const STORE_KEY = { type: 'ee', key: 'admin_users_across_instances' } as const;

// Admin user changes are reported after this delay, so a bulk change sends one report
const REPORT_DELAY_MS = 10_000;

// The license check reports every 12 hours. Past this age the registry has missed several
// reports in a row (404, 429, another license key), so the count is likely stale.
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** The license key to report with, or nothing when the license is not active. */
type GetLicenseKey = () => string | undefined;

/** Reports this instance's active admin users and stores the count. Never throws. */
const reportActiveAdminUsers = async (strapi: Core.Strapi, getLicenseKey: GetLicenseKey) => {
  try {
    const licenseKey = getLicenseKey();
    if (!licenseKey) return;

    const userHashes = await getUserHashes(strapi, licenseKey);
    if (!userHashes) return;

    const count = await reportAdminUsers({ strapi }, licenseKey, userHashes);

    if (count) {
      await strapi.store.set({ ...STORE_KEY, value: count });
    }
  } catch (error) {
    strapi.log.debug(
      `Could not report the admin users: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// Per Strapi instance, so another instance in the same process subscribes on its own database
const watchedStrapis = new WeakSet<Core.Strapi>();

/** Reports the admin users again shortly after a user is created, deleted or changed. */
const watchAdminUsers = (strapi: Core.Strapi, getLicenseKey: GetLicenseKey) => {
  if (watchedStrapis.has(strapi)) return;
  watchedStrapis.add(strapi);

  let timer: NodeJS.Timeout | undefined;
  const scheduleReport = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      reportActiveAdminUsers(strapi, getLicenseKey).catch(() => {});
    }, REPORT_DELAY_MS);
    timer.unref?.();
  };
  const scheduleReportOnUpdate = (event: { params?: { data?: Record<string, unknown> } }) => {
    const data = event.params?.data ?? {};
    if ('isActive' in data || 'email' in data) scheduleReport();
  };

  strapi.db.lifecycles.subscribe({
    models: ['admin::user'],
    afterCreate: scheduleReport,
    afterCreateMany: scheduleReport,
    afterUpdate: scheduleReportOnUpdate,
    afterUpdateMany: scheduleReportOnUpdate,
    afterDelete: scheduleReport,
    afterDeleteMany: scheduleReport,
  });
};

/** The last count the registry sent, or `null` when missing, malformed or older than 48 hours. */
const getAdminUsersAcrossInstances = async ({
  strapi,
}: {
  strapi: Core.Strapi;
}): Promise<AdminUsersAcrossInstances | null> => {
  try {
    const parsed = adminUsersAcrossInstancesSchema.safeParse(await strapi.store.get(STORE_KEY));
    if (!parsed.success) return null;

    const count = parsed.data;
    if (Date.now() - Date.parse(count.updatedAt) > MAX_AGE_MS) return null;

    return count;
  } catch {
    return null;
  }
};

export { reportActiveAdminUsers, watchAdminUsers, getAdminUsersAcrossInstances };
