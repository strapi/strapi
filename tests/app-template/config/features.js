module.exports = ({ env }) => ({
  useLegacyMediaLibrary: env.bool('USE_LEGACY_MEDIA_LIBRARY', false),
  future: {
    // Off by default, like a real install: suites test the product state nobody opted out of.
    // The two-factor API suites switch it on for their own instance; the e2e runner turns it on
    // for a whole run (tests/scripts/run-tests.js), because the admin bundle bakes the flag in at
    // build time and is built once per run.
    unstableAdminMfa: env.bool('UNSTABLE_ADMIN_MFA', false),
  },
});
