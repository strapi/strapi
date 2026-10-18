module.exports = {
  name: 'other-name',
  init: () => ({
    upload: () => Promise.resolve(),
    uploadStream: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  }),
};
