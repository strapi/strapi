'use strict';

/** Every admin suite runs --runInBand against one shared app and the MFA suites change global
 * state, so each starts from what it asserts. Goes through the real store and service. */
export const resetSharedMfaState = async (
  strapi: any,
  options: { userIds?: Array<number | string> } = {}
): Promise<void> => {
  await strapi.store({ type: 'core', name: 'admin' }).set({
    key: 'security-settings',
    value: {
      mfa: { mode: 'optional', graceDays: 7 },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
    },
  });

  await strapi.db.query('admin::role').updateMany({ where: {}, data: { mfaRequired: false } });

  for (const userId of options.userIds ?? []) {
    // eslint-disable-next-line no-await-in-loop
    await strapi.service('admin::mfa').disable(String(userId));
  }

  await strapi.db.query('admin::mfa-trusted-device').deleteMany({ where: {} });
  await strapi.db.query('admin::mfa-passkey').deleteMany({ where: {} });
};
