module.exports = ({ env }) => ({
  future: {
    contentReleases: env.bool('STRAPI_FEATURES_FUTURE_CONTENTRELEASES', false),
  },
});
