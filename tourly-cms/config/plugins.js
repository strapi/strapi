module.exports = ({ env }) => ({
  upload: {
    provider: 'aws-s3',
    providerOptions: {
      accessKeyId: env('AKIA3PSTD4QCEMFWURNW'),
      secretAccessKey: env('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'),
      region: env('eu-west-1'),
      params: {
        Bucket: env('tourly-cms'),
      },
    },
  },
});
