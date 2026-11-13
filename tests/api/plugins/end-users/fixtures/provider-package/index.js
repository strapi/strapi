'use strict';

const { defineProvider } = require('@strapi/plugin-end-users/providers');

/**
 * A generic OAuth provider the API tests install by name (`providers: ['fixture']` resolves
 * `@strapi/provider-end-users-fixture`). It points at an issuer the test serves itself.
 */
module.exports = defineProvider({
  id: 'fixture-idp',
  name: 'Fixture IdP',
  fields: {
    issuer: {
      type: 'url',
      label: 'Issuer URL',
      required: true,
      hint: 'The base URL of the OpenID Connect issuer.',
    },
    audience: { type: 'string', label: 'Audience' },
  },
  claims: {
    department: { type: 'string', label: 'Department' },
    city: { type: 'string', label: 'City', path: 'address.city' },
  },
  defaultScopes: ['openid', 'profile', 'email'],
  init({ clientId, clientSecret, scopes, issuer }) {
    return {
      discoveryUrl: `${String(issuer).replace(/\/$/, '')}/.well-known/openid-configuration`,
      clientId,
      clientSecret,
      scopes,
    };
  },
});
