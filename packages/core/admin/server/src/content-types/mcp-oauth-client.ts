export default {
  collectionName: 'strapi_mcp_oauth_clients',
  info: {
    name: 'MCP OAuth client',
    description: 'OAuth clients registered against the MCP server',
    singularName: 'mcp-oauth-client',
    pluralName: 'mcp-oauth-clients',
    displayName: 'MCP OAuth client',
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
    clientId: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    // HMAC hash of the client secret. Null for public clients (token_endpoint_auth_method 'none').
    clientSecretHash: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    name: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    redirectUris: {
      type: 'json',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    tokenEndpointAuthMethod: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    grantTypes: {
      type: 'json',
      configurable: false,
      private: true,
      searchable: false,
    },
    responseTypes: {
      type: 'json',
      configurable: false,
      private: true,
      searchable: false,
    },
    // `text` columns: the validated maximums (512 for scope, 2000 for the URIs) overflow
    // the varchar(255) a `string` column gets on Postgres/MySQL.
    scope: {
      type: 'text',
      configurable: false,
      private: true,
      searchable: false,
    },
    clientUri: {
      type: 'text',
      configurable: false,
      private: true,
      searchable: false,
    },
    logoUri: {
      type: 'text',
      configurable: false,
      private: true,
      searchable: false,
    },
    registrationSource: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    // When an admin last approved a grant for this client. Dynamically registered clients
    // that never get a grant are cleaned up after a retention window.
    lastGrantedAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
    metadata: {
      type: 'json',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
};
