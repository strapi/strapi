module.exports = () => ({
  upload: {
    config: {
      // Cover both browser-declared and extension-derived executable MIME types
      // so the upload rejection fixture behaves the same in Chromium and WebKit.
      security: {
        deniedTypes: ['application/x-msdownload', 'application/x-msdos-program'],
      },
    },
  },
});
