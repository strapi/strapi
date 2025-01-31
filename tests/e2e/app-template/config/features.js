module.exports = ({ env }) => ({
  future: {
    unstablePreviewSideEditor: env.bool('STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR', false),
    relationsOnTheFlyEnabled: env.bool('STRAPI_FEATURES_RELATIONS_ON_THE_FLY', false),
  },
});
