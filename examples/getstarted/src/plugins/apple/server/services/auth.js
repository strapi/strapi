const jwt = require('jsonwebtoken');

module.exports = ({ strapi }) => ({
  createSecret({ key, teamId, keyIdentifier, secret }) {
    const headers = {
      kid: keyIdentifier,
      typ: undefined,
    };
    const claims = {
      iss: teamId,
      aud: 'https://appleid.apple.com',
      sub: key,
    };
    return jwt.sign(claims, secret, {
      algorithm: 'ES256',
      header: headers,
      expiresIn: strapi.config.get('plugin.users-permissions.jwt.expiresIn'),
    });
  },
});
