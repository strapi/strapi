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
      validate(callback, provider) {
        let uCallback;
        let uProviderCallback;

        try {
          uCallback = new URL(callback);
          uProviderCallback = new URL(provider.callback);
        } catch {
          throw new Error('The callback is not a valid URL');
        }

        // Make sure the different origin matches
        if (uCallback.origin !== uProviderCallback.origin) {
          throw new Error(
            `Forbidden callback provided: origins don't match. Please verify your config.`
          );
        }

        // Make sure the different pathname matches
        if (uCallback.pathname !== uProviderCallback.pathname) {
          throw new Error(
            `Forbidden callback provided: pathname don't match. Please verify your config.`
          );
        }

        // NOTE: We're not checking the search parameters on purpose to allow passing different states
      },
    },
  }),
  validator() {},
};
