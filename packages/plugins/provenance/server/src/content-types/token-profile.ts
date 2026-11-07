import { TOKEN_PROFILES } from '../constants';

/**
 * How an admin qualified an API token (admin or content API kind). A token without a
 * row is "unspecified" and its writes stay unattributed unless the client declares AI.
 */
export default {
  schema: {
    collectionName: 'provenance_token_profiles',
    info: {
      singularName: 'token-profile',
      pluralName: 'token-profiles',
      displayName: 'Token provenance profile',
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
    },
    attributes: {
      tokenId: { type: 'string', required: true, unique: true },
      profile: { type: 'enumeration', enum: [...TOKEN_PROFILES], required: true },
    },
  },
};
