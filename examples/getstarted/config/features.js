module.exports = ({ env }) => ({
  future: {
    history: true,
    contentReleasesScheduling: env.bool('STRAPI_FUTURE_CONTENT_RELEASES_SCHEDULING', false),
  },
});
