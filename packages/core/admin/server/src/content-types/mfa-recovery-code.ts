export default {
  collectionName: 'strapi_admin_mfa_recovery_codes',
  info: {
    name: 'MFA Recovery Code',
    description: 'Single-use recovery codes. One row per code so consumption is a row update.',
    singularName: 'mfa-recovery-code',
    pluralName: 'mfa-recovery-codes',
    displayName: 'MFA Recovery Code',
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
    codeHash: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    usedAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
};
