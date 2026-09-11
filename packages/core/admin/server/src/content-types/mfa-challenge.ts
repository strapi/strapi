export default {
  collectionName: 'strapi_admin_mfa_challenges',
  info: {
    name: 'MFA Challenge',
    description: 'Pending second-factor challenges. Grants no access on its own.',
    singularName: 'mfa-challenge',
    pluralName: 'mfa-challenges',
    displayName: 'MFA Challenge',
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
    token: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    userId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    factorType: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    attempts: {
      type: 'integer',
      default: 0,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    expiresAt: {
      type: 'datetime',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    consumedAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
    // Passkeys: the WebAuthn challenge for a *login* ceremony, set by
    // `POST /admin/login/mfa/webauthn/options` and cleared by this row's deletion (the consume) or
    // its expiry sweep. Nullable, so every existing row and every TOTP-only challenge is
    // untouched.
    webauthnChallenge: {
      type: 'string',
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
      // The expiry sweep and every per-user challenge lookup scan on this.
      name: 'strapi_admin_mfa_challenges_user_id_index',
      columns: ['user_id'],
      type: null,
    },
  ],
};
