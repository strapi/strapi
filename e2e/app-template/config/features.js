/**
 * A strapi template does not allow the config folder and therefore cannot generate an app
 * with future flags set. This file will be copied into the generated app's config folder during
 * the run-e2e-tests script.
 */
module.exports = ({ env }) => ({
  future: {
    history: env.bool('STRAPI_FEATURES_FUTURE_CONTENT_HISTORY', false),
  },
});
