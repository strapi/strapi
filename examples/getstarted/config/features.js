module.exports = ({ env }) => ({
  future: {
    contentReleasesScheduling: env.bool('STRAPI_FUTURE_CONTENT_RELEASES_SCHEDULING', false),
  },
});
