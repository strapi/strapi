/**
 * Better Auth is an ES module and this plugin is CommonJS, so it loads Better Auth with `require()`.
 * Node supports that without a flag from 22.12. On an older Node the load fails with
 * `ERR_REQUIRE_ESM`, which says nothing about what to do, so this fails first, and says it.
 *
 * It runs when the module is loaded, and it is imported before anything that reaches Better Auth
 * (the plugin entry, and the `auth/plugins` and `auth/passkey` entry points of a project's
 * `config/plugins.ts`).
 */
const MINIMUM = { major: 22, minor: 12 };

export const assertNodeVersion = (version: string = process.versions.node): void => {
  const [major, minor] = version.split('.').map(Number);

  if (major < MINIMUM.major || (major === MINIMUM.major && minor < MINIMUM.minor)) {
    throw new Error(
      `@strapi/plugin-end-users needs Node.js ${MINIMUM.major}.${MINIMUM.minor} or later: ` +
        'it loads Better Auth, which is an ES module, with require(), and that is only ' +
        `supported from that version. This is Node.js ${version}.`
    );
  }
};

assertNodeVersion();
