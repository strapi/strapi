export default {
  collectionName: 'strapi_mcp_oauth_codes',
  info: {
    name: 'MCP OAuth authorization code',
    description: 'Single-use OAuth authorization codes issued by the MCP server',
    singularName: 'mcp-oauth-authorization-code',
    pluralName: 'mcp-oauth-authorization-codes',
    displayName: 'MCP OAuth authorization code',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
    i18n: {
      localized: false,
    },
  },
  attributes: {
    // HMAC hash of the authorization code. The plaintext code is never stored.
    codeHash: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    clientId: {
      type: 'string',
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
    // `text`, not `string`: registered redirect URIs may be up to 2000 characters, which
    // overflows the varchar(255) a `string` column gets on Postgres/MySQL.
    redirectUri: {
      type: 'text',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    codeChallenge: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    codeChallengeMethod: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    // `text` so scopes up to the validated 512 characters fit on Postgres/MySQL.
    scope: {
      type: 'text',
      configurable: false,
      private: true,
      searchable: false,
    },
    resource: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    // Grant family id: becomes the session manager deviceId for the tokens issued from this code.
    grantId: {
      type: 'string',
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
    // Set when the code is exchanged. Consumed rows are kept until they expire so a
    // replayed code can be detected and the grant family revoked.
    consumedAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
};
