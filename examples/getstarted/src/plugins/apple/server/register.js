'use strict';

const jwt = require('jsonwebtoken');

module.exports = ({ strapi }) => {
  strapi.service('plugin::users-permissions.providers-registry').register(
    'apple',
    ({ purest }) => {
      const apple = async ({ accessToken }) => {
        const tokenPayload = jwt.decode(accessToken);
        if (!tokenPayload) {
          throw new Error('unable to decode jwt token');
        }
        return {
          username: tokenPayload.sub,
          email: tokenPayload.email,
        };
      };

      return apple;
    },
    {
      defaultGrantConfig: (baseURL) => ({
        enabled: false,
        icon: 'apple',
        key: '',
        secret: '',
        teamId: '',
        keyIdentifier: '',
        callback: `${baseURL}/apple/callback`,
        scope: ['name', 'email'],
        nonce: true,
        state: true,
        custom_params: {
          response_type: 'code id_token',
          response_mode: 'form_post',
        },
      }),
      buildRedirectUri: ({ urlJoin, baseURL, apiPrefix }) => urlJoin(baseURL, 'apple', 'callback'),
      connectGrant: (config) => ({
        ...config,
        secret: strapi.service('plugin::apple.auth').createSecret(config),
      }),
    }
  );
};
