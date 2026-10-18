module.exports = {
  init: () => ({
    upload: () => Promise.resolve(),
    uploadStream: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  }),
};
