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
    },
  },
  documentation: {
    config: {
      info: {
        version: '2.0.0',
      },
    },
  },
  upload: {
    config: {
      provider: 'aws-s3',
      sizeLimit: 10,
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
        region: env('AWS_REGION'),
        params: {
          Bucket: env('AWS_BUCKET'),
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  myplugin: {
    enabled: true,
    resolve: `./src/plugins/myplugin`, // From the root of the project
    config: {
      testConf: 3,
    },
  },
});
