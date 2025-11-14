'use strict';

/* eslint-env jest */
/* eslint-disable import/no-extraneous-dependencies */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

let strapi;

const makeRSAKeys = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
};

describe('Content API JWT Algorithm Configuration (refresh mode)', () => {
  const user = {
    username: 'algo-user',
    email: 'algo-user@strapi.io',
    password: 'Test1234',
    confirmed: true,
    provider: 'local',
  };

  afterEach(async () => {
    if (strapi) {
      await strapi.db.query('plugin::users-permissions.user').deleteMany();
      await strapi.destroy();
      strapi = null;
    }
  });

  test('Defaults to HS256 when no algorithm configured', async () => {
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
        // Ensure a secret exists for HS algorithms
        s.config.set('plugin::users-permissions.jwtSecret', 'test-secret');
      },
    });

    await createAuthenticatedUser({ strapi, userInfo: user });

    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');
    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      body: { identifier: user.email, password: user.password },
    });

    expect(res.statusCode).toBe(200);
    const token = res.body.jwt;
    expect(typeof token).toBe('string');
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded && decoded.header && decoded.header.alg).toBe('HS256');
  });

  test('Uses configured symmetric algorithm (HS384)', async () => {
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
        s.config.set('plugin::users-permissions.jwtSecret', 'test-secret');
        s.config.set('plugin::users-permissions.jwt', {
          algorithm: 'HS384',
          issuer: 'up-hs-issuer',
          audience: 'up-hs-aud',
        });
      },
    });

    await createAuthenticatedUser({ strapi, userInfo: user });

    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');
    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      body: { identifier: user.email, password: user.password },
    });

    expect(res.statusCode).toBe(200);
    const token = res.body.jwt;
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded && decoded.header && decoded.header.alg).toBe('HS384');
    expect(decoded && decoded.payload && decoded.payload.iss).toBe('up-hs-issuer');
    expect(decoded && decoded.payload && decoded.payload.aud).toBe('up-hs-aud');
  });

  test('Uses configured asymmetric algorithm (RS256)', async () => {
    const { publicKey, privateKey } = makeRSAKeys();

    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
        s.config.set('plugin::users-permissions.jwt', {
          algorithm: 'RS256',
          privateKey,
          publicKey,
          issuer: 'up-rs-issuer',
          audience: 'up-rs-aud',
        });
      },
    });

    await createAuthenticatedUser({ strapi, userInfo: user });

    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');
    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      body: { identifier: user.email, password: user.password },
    });

    expect(res.statusCode).toBe(200);
    const token = res.body.jwt;
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded && decoded.header && decoded.header.alg).toBe('RS256');
    expect(decoded && decoded.payload && decoded.payload.iss).toBe('up-rs-issuer');
    expect(decoded && decoded.payload && decoded.payload.aud).toBe('up-rs-aud');

    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'up-rs-issuer',
      audience: 'up-rs-aud',
    });
    expect(verified && verified.type).toBe('access');
  });
});
