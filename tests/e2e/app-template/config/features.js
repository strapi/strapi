module.exports = ({ env }) => ({
  future: {
    unstableGuidedTour: env.bool('STRAPI_FEATURES_UNSTABLE_GUIDED_TOUR', false),
  },
});
