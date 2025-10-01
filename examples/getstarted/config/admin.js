module.exports = ({ env }) => ({
  // autoOpen: false,
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'example-token'),
    sessions: {
      options: {
        //algorithm: env('ADMIN_JWT_ALGORITHM', 'HS256'),
        // Any other JWT options (issuer, audience, subject, etc.) can be added here
      },
      // Token and session lifespan configuration
      accessTokenLifespan: 30 * 60, // 30 minutes
      maxRefreshTokenLifespan: 30 * 24 * 60 * 60, // 30 days
      idleRefreshTokenLifespan: 14 * 24 * 60 * 60, // 14 days
      maxSessionLifespan: 24 * 60 * 60, // 1 day
      idleSessionLifespan: 2 * 60 * 60, // 2 hours
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'example-salt'),
  },
  auditLogs: {
    enabled: env.bool('AUDIT_LOGS_ENABLED', true),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'example-salt'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY', 'example-key'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  preview: {
    enabled: env.bool('PREVIEW_ENABLED', true),
    config: {
      handler: (uid, { documentId, locale, status }) => {
        const contentType = strapi.contentType(uid);
        const kind = contentType.kind === 'collectionType' ? 'collection-types' : 'single-types';
        const apiName =
          contentType.kind === 'collectionType'
            ? contentType.info.pluralName
            : contentType.info.singularName;

        return `/admin/preview/${kind}/${apiName}/${documentId}/${locale}/${status}`;
      },
    },
  },
  ai: {
    enabled: true,
  },
});
