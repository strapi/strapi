module.exports = ({ env }) => ({
  future: {
    contentReleasesScheduling: env.bool('STRAPI_FEATURES_FUTURE_RELEASES_SCHEDULING', false),
  },
});
