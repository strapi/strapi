'use strict';

const STORE_KEY = 'credentials';

const sanitize = (credentials) => {
  if (!credentials) {
    return { configured: false };
  }

  if (credentials.kind === 'apiKey') {
    return { configured: true, kind: 'apiKey' };
  }

  return {
    configured: true,
    kind: 'serviceAccount',
    projectId: credentials.projectId || null,
    clientEmail: credentials.clientEmail || null,
  };
};

module.exports = ({ strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: 'google-translate' });

  return {
    async get() {
      const value = await store().get({ key: STORE_KEY });
      return value || null;
    },

    async getPublic() {
      return sanitize(await this.get());
    },

    async save({ credentialsJson, apiKey } = {}) {
      const jsonInput = typeof credentialsJson === 'string' ? credentialsJson.trim() : '';
      const keyInput = typeof apiKey === 'string' ? apiKey.trim() : '';

      if (!jsonInput && !keyInput) {
        await store().set({ key: STORE_KEY, value: null });
        return sanitize(null);
      }

      if (jsonInput) {
        let parsed;
        try {
          parsed = JSON.parse(jsonInput);
        } catch {
          throw new Error('Service account JSON is not valid JSON');
        }

        if (parsed.type !== 'service_account' || !parsed.private_key || !parsed.client_email) {
          throw new Error(
            'JSON must be a Google service account key (type, client_email, private_key)'
          );
        }

        const credentials = {
          kind: 'serviceAccount',
          projectId: parsed.project_id || null,
          clientEmail: parsed.client_email,
          json: parsed,
        };

        await store().set({ key: STORE_KEY, value: credentials });
        return sanitize(credentials);
      }

      const credentials = {
        kind: 'apiKey',
        apiKey: keyInput,
      };

      await store().set({ key: STORE_KEY, value: credentials });
      return sanitize(credentials);
    },
  };
};
