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
};
