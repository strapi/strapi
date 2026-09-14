export default {
  collectionName: 'strapi_admin_mfa_passkeys',
  info: {
    name: 'MFA Passkey',
    description:
      'WebAuthn credentials registered as a second factor. Origin-bound by the browser, so they cannot be phished; the private key never leaves the authenticator.',
    singularName: 'mfa-passkey',
    pluralName: 'mfa-passkeys',
    displayName: 'MFA Passkey',
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
    // Unique across the whole table, not per user, so "this credential already belongs to somebody"
    // is a database constraint rather than a lookup somebody might forget to write. varchar(255) so
    // the index stays portable; a longer id is refused before the insert.
    credentialId: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    // Base64URL of the COSE key. `text`, not `string`: an RSA-2048 key is ~374 characters and
    // varchar(255) would truncate or reject it.
    publicKey: {
      type: 'text',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    // A WebAuthn signature counter is a uint32, which overflows a signed `integer`. `biginteger`
    // reads back from the database as a *string*, so every use passes `Number(row.counter)`.
    counter: {
      type: 'biginteger',
      required: true,
      default: 0,
      configurable: false,
      private: true,
      searchable: false,
    },
    // Comma-joined transport hints (`internal,hybrid`), split back to an array wherever the
    // library is called. Nullable: an authenticator need not report any.
    transports: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    // There is no rename route, so this is written once.
    name: {
      type: 'string',
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
  // Every query against this table narrows by user first, and several run on the login path.
  indexes: [
    {
      name: 'strapi_admin_mfa_passkeys_user_id_index',
      columns: ['user_id'],
      type: null,
    },
  ],
};
