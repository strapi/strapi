module.exports = ({ env }) => ({
  future: {
    relationsOnTheFlyEnabled: env.bool('STRAPI_FEATURES_RELATIONS_ON_THE_FLY', false),
  },
});
