module.exports = ({ env }) => ({
  useLegacyMediaLibrary: env.bool('USE_LEGACY_MEDIA_LIBRARY', false),
  future: {
    // The e2e template enables the flag by default so the Two-factor journeys run in CI; MFA is
    // opt-in per user, so no other suite's behaviour is affected.
    unstableAdminMfa: env.bool('UNSTABLE_ADMIN_MFA', true),
  },
});
