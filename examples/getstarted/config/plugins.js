'use strict';

module.exports = ({ env }) => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',

      defaultLimit: 25,
      maxLimit: 100,

      apolloServer: {
        tracing: true,
      },

      v4CompatibilityMode: true,
    },
  },
  documentation: {
    config: {
      info: {
        version: '1.0.0',
      },
    },
  },
  myplugin: {
    enabled: true,
    resolve: `./src/plugins/local-plugin`, // From the root of the project
    config: {
      testConf: 3,
    },
  },
  // NOTE: set enabled:true to test with a pre-built plugin. Make sure to run yarn build in the plugin folder first
  todo: {
    enabled: false,
    resolve: `../plugins/todo-example`, // From the /examples/plugins folder
  },

  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: env('SMTP_PORT', 1025),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_EMAIL'),
        defaultReplyTo: env('SMTP_EMAIL'),
      },
    },
  },
});
