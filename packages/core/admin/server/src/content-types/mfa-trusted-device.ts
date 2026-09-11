export default {
  collectionName: 'strapi_admin_mfa_trusted_devices',
  info: {
    name: 'MFA Trusted Device',
    description:
      'Browsers allowed to skip the second factor until an absolute expiry. Grants nothing without the password.',
    singularName: 'mfa-trusted-device',
    pluralName: 'mfa-trusted-devices',
    displayName: 'MFA Trusted Device',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': { visible: false },
    'content-type-builder': { visible: false },
    i18n: { localized: false },
  },
  attributes: {
    userId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    // sha256 hex of the 32 random bytes the browser holds in the trust cookie. The raw token
    // is never stored anywhere.
    tokenHash: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    // The client's own deviceId at grant time: a label and correlation key, no security role.
    deviceId: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    deviceName: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    // Absolute: createdAt + settings.days at grant. Never slides. The read-time ceiling
    // min(expiresAt, createdAt + current days) lives in services/mfa-trusted-devices.ts.
    expiresAt: {
      type: 'datetime',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    lastUsedAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
  // Every query in `services/mfa*.ts` against this table narrows by user first, and
  // several run on the login path. Declared the way `upload`'s file content type
  // declares its own.
  indexes: [
    {
      // Listing, the per-user cap and the cascade clears all read by user.
      name: 'strapi_admin_mfa_trusted_devices_user_id_index',
      columns: ['user_id'],
      type: null,
    },
  ],
};
