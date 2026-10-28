module.exports = () => ({
  upload: {
    config: {
      // Narrow, unambiguous deny so the upload journey's "unsupported file type"
      // step has something real to reject — the default config allows every type.
      security: {
        deniedTypes: ['application/x-msdownload'],
      },
    },
  },
});
