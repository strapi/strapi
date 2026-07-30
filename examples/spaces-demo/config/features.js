module.exports = ({ env }) => ({
  future: {
    unstableMediaLibrary: env.bool('UNSTABLE_MEDIA_LIBRARY', false),
  },
});
