module.exports = ({ env }) => ({
  future: {
    unstablePreviewSideEditor: env.bool('STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR', false),
    unstableRelationsOnTheFly: env.bool('STRAPI_FEATURES_UNSTABLE_RELATIONS_ON_THE_FLY', false),
  },
});
