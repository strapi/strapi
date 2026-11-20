const { mergeConfig } = require('vite');

module.exports = (config) => {
  // Important: always return the modified config
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    // Optional: exclude a thin shared UI kit that breaks when Vite rebundles it against
    // Strapi's React / design-system singletons. Kit authors can instead set in package.json:
    //   "strapi": { "admin": { "vite": { "optimizeDepsExclude": true } } }
    // Do not exclude large plugins (editors, charts, …) — that orphans their CJS deps.
    // optimizeDeps: {
    //   exclude: ['strapi-design-extended'],
    // },
  });
};
