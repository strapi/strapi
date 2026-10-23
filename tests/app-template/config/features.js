module.exports = ({ env }) => ({
  useLegacyMediaLibrary: env.bool('USE_LEGACY_MEDIA_LIBRARY', false),
  future: {
    // The skipped entries side panel of content releases is built with the next design system
    unstableNextDesignSystem: true,
  },
});
