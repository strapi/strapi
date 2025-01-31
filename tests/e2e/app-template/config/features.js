module.exports = ({ env }) => ({
  future: {
    unstablePreviewSideEditor: env.bool('STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR', false),
  },
});
