module.exports = ({ env }) => ({
  // autoOpen: false,
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'example-token'),
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
  secret: {
    encryptionKey: env(
      'SECRET_ENCRYPTION_KEY',
      '5444d6c7ba5f928259a759b396165b23587ccf9cc99d2ebe608098190e296736'
    ),
    // createProvider: () => {
    //   return {
    //     store: (key, value) => {
    //       console.log(key, value);
    //     },
    //     retrieve: (key) => {
    //       console.log(key);
    //     },
    //   };
    // },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  preview: {
    enabled: env.bool('PREVIEW_ENABLED', true),
    config: {
      handler: (uid, { documentId, locale, status }) => {
        const kind =
          strapi.contentType(uid).kind === 'collectionType' ? 'collection-types' : 'single-types';
        return `/admin/preview/${kind}/${uid}/${documentId}/${locale}/${status}`;
      },
    },
  },
});
