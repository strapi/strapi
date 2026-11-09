module.exports = ({ env }) => ({
  useLegacyMediaLibrary: env.bool('USE_LEGACY_MEDIA_LIBRARY', false),
});
