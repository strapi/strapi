module.exports = ({ env }) => ({
  future: {
    preview: env.bool('STRAPI_FUTURE_PREVIEW', false),
  },
});
