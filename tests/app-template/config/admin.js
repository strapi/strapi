module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    // WebAuthn refuses an IP-literal relying-party id, and the harness serves this app on
    // 127.0.0.1. `localhost` is the one dotless host browsers accept, so the passkey specs
    // navigate there (see `mfa-passkeys.spec.ts`'s `test.use({ baseURL })`) and the expected
    // origin is pinned to match. The port is per-worker and the harness sets PORT; the fallback
    // tracks `config/server.js`'s, since the two must name the same port when it is unset.
    mfa: {
      webauthn: {
        rpId: 'localhost',
        origins: [`http://localhost:${env.int('PORT', 1337)}`],
      },
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  secrets: {
    encryptionKey: 'example-key',
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
  preview: {
    enabled: true,
    config: {
      handler(uid, { documentId, locale, status }) {
        if (uid === 'api::product.product') {
          return null;
        }

        return `https://strapi.io/preview/${uid}/${documentId}/${locale}/${status}`;
      },
    },
  },
});
