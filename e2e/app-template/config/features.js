module.exports = ({ env }) => ({
  future: {
    history: env.bool('STRAPI_FEATURES_FUTURE_CONTENT_HISTORY', false),
    contentReleasesScheduling: env.bool('STRAPI_FEATURES_FUTURE_RELEASES_SCHEDULING', false),
  },
});
