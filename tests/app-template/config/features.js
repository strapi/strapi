module.exports = ({ env }) => ({
  future: {
    unstableMediaLibrary: env.bool('UNSTABLE_MEDIA_LIBRARY', false),
    adminTokens: env.bool('ENABLE_ADMIN_TOKENS', true),
  },
});
