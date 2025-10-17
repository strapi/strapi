module.exports = ({ env }) => ({
  future: {
    unstableAILocalizations: env.bool('STRAPI_FEATURES_UNSTABLE_AI_LOCALIZATIONS', false),
  },
});
