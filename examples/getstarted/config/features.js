module.exports = ({ env }) => ({
  future: {
    contentReleasesScheduling: env('STRAPI_FUTURE_CONTENT_RELEASES_SCHEDULING', false),
  },
});
