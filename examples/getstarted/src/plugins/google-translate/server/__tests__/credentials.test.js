'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const createCredentials = require('../services/credentials');

const createStrapi = () => {
  let stored = null;

  return {
    store() {
      return {
        get: async () => stored,
        set: async ({ value }) => {
          stored = value;
        },
      };
    },
  };
};

const serviceAccount = {
  type: 'service_account',
  project_id: 'demo',
  client_email: 'translate@demo.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n',
};

describe('credentials service', () => {
  it('reports that nothing is configured', async () => {
    const service = createCredentials({ strapi: createStrapi() });

    assert.deepEqual(await service.getPublic(), { configured: false });
  });

  it('stores an API key without returning the key', async () => {
    const service = createCredentials({ strapi: createStrapi() });

    assert.deepEqual(await service.save({ apiKey: '  abc123  ' }), {
      configured: true,
      kind: 'apiKey',
    });
    assert.equal((await service.get()).apiKey, 'abc123');
    assert.equal((await service.getPublic()).apiKey, undefined);
  });

  it('stores a service account without returning the private key', async () => {
    const service = createCredentials({ strapi: createStrapi() });

    const pub = await service.save({ credentialsJson: JSON.stringify(serviceAccount) });

    assert.deepEqual(pub, {
      configured: true,
      kind: 'serviceAccount',
      projectId: 'demo',
      clientEmail: 'translate@demo.iam.gserviceaccount.com',
    });
    assert.equal((await service.getPublic()).private_key, undefined);
    assert.equal((await service.get()).json.private_key, serviceAccount.private_key);
  });

  it('rejects JSON that is not a service account key', async () => {
    const service = createCredentials({ strapi: createStrapi() });

    await assert.rejects(() => service.save({ credentialsJson: '{not json' }), /not valid JSON/);
    await assert.rejects(
      () => service.save({ credentialsJson: JSON.stringify({ type: 'user' }) }),
      /service account key/
    );
  });

  it('clears stored credentials when both inputs are empty', async () => {
    const service = createCredentials({ strapi: createStrapi() });
    await service.save({ apiKey: 'abc123' });

    assert.deepEqual(await service.save({ credentialsJson: '  ', apiKey: '' }), {
      configured: false,
    });
    assert.equal(await service.get(), null);
  });
});
