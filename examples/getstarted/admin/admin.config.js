module.exports = {
  webpack: (config, webpack) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    // Important: return the modified config
    return config;
  },
  app: config => {
    config.locales = ['fr'];

    return config;
  },
};
