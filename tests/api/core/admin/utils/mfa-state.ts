'use strict';

/**
 * The shared-app reset every MFA API suite needs: security settings back to their defaults, no
 * role flagged, the named users' second factors removed, and both credential tables emptied.
 *
 * `yarn test:api` runs every admin suite --runInBand against one shared SQLite app, and the
 * sibling MFA suites deliberately change global state (the enforcement suite raises the mode and
 * enrols the super admin; the trusted-device and passkey suites leave rows behind). Every MFA
 * suite therefore starts from the exact state it asserts, whatever ran before it.
 *
 * Goes through the same store and the same service the server uses, so it cannot drift from the
 * real defaults.
 *
 * `strapi` is `any` here to match every sibling suite in this directory, which type the running
 * instance the same way.
 */
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
    // `disable` clears the secret, the pending secret, the recovery codes, outstanding
    // challenges, the trusted devices and the passkeys of that user in one transaction.
    // eslint-disable-next-line no-await-in-loop
    await strapi.service('admin::mfa').disable(String(userId));
  }

  // Every other user's rows, from whatever ran before this suite.
  await strapi.db.query('admin::mfa-trusted-device').deleteMany({ where: {} });
  await strapi.db.query('admin::mfa-passkey').deleteMany({ where: {} });
};
