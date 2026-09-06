module.exports = ({ env }) => ({
  future: {
    betaMediaLibrary: env.bool('BETA_MEDIA_LIBRARY', false),
  },
});
