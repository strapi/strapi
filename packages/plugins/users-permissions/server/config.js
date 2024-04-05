'use strict';

module.exports = {
  default: ({ env }) => ({
    jwtSecret: env('JWT_SECRET'),
    jwt: {
      expiresIn: '30d',
    },
    ratelimit: {
      interval: 60000,
      max: 10,
    },
    layout: {
      user: {
        actions: {
          create: 'contentManagerUser.create', // Use the User plugin's controller.
          update: 'contentManagerUser.update',
        },
      },
    },
    callback: {
      validate(url, provider) {
        const uCallback = new URL(url);
        const uRedirect = new URL(provider.redirectUri);

        // The default validation checks that the provided callback's origin matches the provider redirectUri origin
        if (uCallback.origin !== uRedirect.origin) {
          throw new Error(
            `Forbidden callback provided: origins don't match (${uCallback.origin} !== ${uRedirect.origin})`
          );
        }
      },
    },
  }),
  validator() {},
};
