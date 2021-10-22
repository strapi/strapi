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
          create: 'User.create', // Use the User plugin's controller.
          update: 'User.update',
        },
      },
    },
  }),
  validator() {},
};
