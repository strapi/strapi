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
    // The sha256 of the challenge token, as for trusted devices. Looked up by this alone on every
    // second-factor login. `column.unique` is what creates the
    // index (see `mfa-passkey.ts`): the attribute-level `unique` alone made each lookup a full scan.
    token: {
      type: 'string',
      unique: true,
      column: { unique: true },
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
    // The WebAuthn challenge for a *login* ceremony, set by
    // `POST /admin/login/mfa/webauthn/options` and cleared by this row's deletion (the consume) or
    // its expiry sweep. Nullable: a TOTP-only challenge has none.
    webauthnChallenge: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    // A password reset of an enrolled account, waiting on the second factor: the bcrypt hash of the
    // new password, committed by whichever login route consumes this row. Until then the old
    // password stands, so someone holding only the mailbox cannot change it.
    pendingPasswordHash: {
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
      // Every per-user challenge lookup scans on this.
      name: 'strapi_admin_mfa_challenges_user_id_index',
      columns: ['user_id'],
      type: null,
    },
    {
      // The expiry sweep filters on nothing else. The expired set is small by construction, but
      // without this the sweep still reads the whole table to find it, at boot and again daily.
      name: 'strapi_admin_mfa_challenges_expires_at_index',
      columns: ['expires_at'],
      type: null,
    },
  ],
};
