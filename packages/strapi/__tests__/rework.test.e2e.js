'use strict';

// eslint-disable-next-line node/no-extraneous-require
const request = require('supertest');

const adminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const createAdminAgent = async () => {
  const agent = request.agent(strapi.server);
  const adminServices = strapi.admin.services;
  const superAdminRole = await adminServices.role.getSuperAdmin();
  const hasAdmin = await adminServices.user.exists();

  const admin = hasAdmin
    ? await adminServices.user.findOne({ 'roles.id': superAdminRole.id })
    : await adminServices.user.create({
        ...adminCredentials,
        registrationToken: null,
        isActive: true,
        roles: superAdminRole ? [superAdminRole.id] : [],
      });

  const token = adminServices.token.createJwtToken(admin);

  agent.auth(token, { type: 'bearer' });

  return agent;
};

describe('Rework test', () => {
  let agent;

  beforeAll(async () => {
    agent = await createAdminAgent();
  });

  test('Simple request with supertest', async () => {
    // Async await
    const res = await (() => agent.get('/admin/users'))();
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(1);

    // Chained
    // await agent
    //   .get('/admin/users')
    //   .expect(200);
  });
});
