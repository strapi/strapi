module.exports = () => ({
  upload: {
    config: {
      // Narrow, unambiguous deny so J1's "unsupported file type" step (CMS-249)
      // has something real to reject — the default config allows every type.
      security: {
        deniedTypes: ['application/x-msdownload'],
      },
    },
  },
});
