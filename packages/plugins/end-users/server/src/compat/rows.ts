/**
 * Compatibility mode's checklist: one entry for each of the 36 items of the Users & Permissions
 * checklist, with what a project that keeps the behavior will notice and the note the migration's
 * dry-run report prints. The tests that prove each item live beside the unit tests, not here.
 */

export interface CompatRow {
  /** The item of the checklist, 1 to 36. */
  row: number;
  class: 'must-keep' | 'shim' | 'major';
  /** What a project that keeps this behavior will notice, for the items where there is one. */
  break?: string;
  /** What the dry-run report tells the project owner, in plain words. */
  note?: string;
}

export const COMPAT_ROWS: ReadonlyArray<CompatRow> = [
  {
    row: 1,
    class: 'must-keep',
    break:
      'The jwt that /api/auth/local returns is an opaque session token, not a JWT. It works as a Bearer token ' +
      'everywhere, but a front end that decodes it to read the user id or the expiry gets nothing. A user with ' +
      'two-factor authentication on gets 403 TWO_FACTOR_REQUIRED and no token from /api/auth/local and from the ' +
      'GraphQL login, because an old front end has no second step; they sign in through the native sign-in instead.',
    note:
      'A migrated username that contains an @ cannot sign in by username, because the sign-in treats any identifier ' +
      'with an @ as an email address. The dry-run lists those usernames.',
  },
  {
    row: 2,
    class: 'must-keep',
    note:
      'Register keeps the old "Email or Username are already taken" answer, so on this route the answer tells a ' +
      'caller whether an address is registered, which the native route hides. The route is rate limited, and ' +
      'turning compatibility mode off closes it. Registering through compatibility mode also accepts a username the ' +
      'native sign-in by username refuses (too short, or with a hyphen); those users sign in through the compatible ' +
      '/api/auth/local, or by email, until the username rules are relaxed.',
  },
  {
    row: 3,
    class: 'must-keep',
  },
  {
    row: 4,
    class: 'shim',
    note:
      'Old Users & Permissions tokens work only after the migration records that it completed, and only if the token ' +
      'was issued no later than the cutover. Before that, and for anything issued after, they get a 401 and the user ' +
      'signs in again. Tokens signed with another secret, expired, or unsigned are refused in every case. The ' +
      'Advanced page counts the old tokens that are still being used, so the project can pick a day to switch the ' +
      'bridge off.',
  },
  {
    row: 5,
    class: 'must-keep',
  },
  {
    row: 6,
    class: 'must-keep',
    note:
      'With compatibility mode on, the authentication strategy keeps the name users-permissions and ' +
      'ctx.state.user.role is the first role as { id, name, description, type }, next to roles. A user with several ' +
      'roles therefore shows only the first one through role, so code that reads role to make a decision sees a ' +
      'partial picture. The real users-permissions plugin must not be enabled next to compatibility mode, or the ' +
      'server refuses to start.',
  },
  {
    row: 7,
    class: 'must-keep',
    break:
      'The user content type is plugin::end-users.user, and nothing answers to plugin::users-permissions.user any ' +
      'more. Custom code that names the old UID, calls strapi.plugin("users-permissions") or its services, or ' +
      'extends it through strapi-server fails at start, not silently.',
    note:
      'The codemod rewrites the old UID in schemas and code, and flags every use of the old plugin name, its ' +
      'services and its strapi-server extension for a person to review. There is no runtime alias on purpose: an ' +
      'alias would hide a change that touches who can sign in.',
  },
  {
    row: 8,
    class: 'must-keep',
    note:
      'The data move belongs to the migration: users, roles, permissions and their links, including provider, ' +
      'confirmed, blocked, documentId and custom attributes. Each user keeps the integer id, because old tokens and ' +
      'old front ends refer to it. A ?confirmation= link sent before the cutover works through the reader of the ' +
      'carried confirmation token (a 40-character hex value is looked up in that column instead of being verified as a ' +
      'signed token). Reset tokens that were pending at the cutover are not ' +
      'carried over, so a reset in flight is lost and the user asks again.',
  },
  {
    row: 9,
    class: 'must-keep',
    break:
      'Custom fields are now fields of the end-user profile, not of the user. Through compatibility mode they still ' +
      'show up in the user payloads and can be written through /api/users, but a schema extension written for the ' +
      'old plugin is not read.',
    note:
      'The codemod rewrites the targets of the old schema extension and moves each custom field to the profile. ' +
      'GraphQL shows the profile fields on the me type and the login payload only; the user list type does not merge ' +
      'them, so a front end that reads a custom field from a GraphQL user list needs a change.',
  },
  {
    row: 10,
    class: 'must-keep',
    note:
      'A user can now hold several roles. The single role that old code reads is the first of them, so it is a lossy ' +
      'view. Setting a role through /api/users is refused, because that was how a request could grant itself a ' +
      'role; roles are set in the Content Manager.',
  },
  {
    row: 11,
    class: 'must-keep',
  },
  {
    row: 12,
    class: 'must-keep',
    note:
      'An invalid or expired token still answers 401, which is what front-end refresh logic reacts to. A request ' +
      'from a banned user or one whose address is not verified now answers 403 with a code, where the old plugin ' +
      'answered 401, so a front end that treated every refusal as a reason to sign in again shows "forbidden' +
      '" for those users instead.',
  },
  {
    row: 13,
    class: 'must-keep',
    note:
      'At sign-in a blocked or unconfirmed user gets the old 400 with the old text. On every later request they get ' +
      '403 with a code instead of 401.',
  },
  {
    row: 14,
    class: 'must-keep',
  },
  {
    row: 15,
    class: 'must-keep',
    note:
      'A password reset now signs the user out everywhere: every session that existed before it ends, and the ' +
      'answer carries the one new session. The old plugin left other sessions alive.',
  },
  {
    row: 16,
    class: 'must-keep',
  },
  {
    row: 17,
    class: 'shim',
    note:
      'Emails carry the old-style links (?code= for a reset, ?confirmation= for a confirmation). The old templates, ' +
      'written with <%= URL %>, <%= TOKEN %>, <%= CODE %> and <%= USER.* %>, are not rendered as they are: the ' +
      'migration translates each template to the new variables, and templates it cannot translate are listed for a ' +
      'person to rewrite.',
  },
  {
    row: 18,
    class: 'must-keep',
  },
  {
    row: 19,
    class: 'must-keep',
    note:
      'The addresses registered at each identity provider keep working, so the migration asks for no change at the ' +
      'provider. With compatibility mode on, every provider gets /api/connect/<provider>/callback as its redirect ' +
      'address; the admin shows it.',
  },
  {
    row: 20,
    class: 'must-keep',
    break:
      'The browser comes back from the provider to the front-end URL with no token in the address. The front end ' +
      'must call /api/auth/<provider>/callback, which answers { jwt, user } once, for a session made in the last ' +
      'five minutes, under the same provider name. A front end that read the token from the query string must change.',
  },
  {
    row: 21,
    class: 'must-keep',
    note:
      "The migration moves each provider's key, secret, subdomain, JWKS URL and enabled flag from the old store " +
      'into the new provider settings. The front-end address each provider used to return to is written to ' +
      'compat.connect.callbacks, so the dry-run lists each one for the project to review.',
  },
  {
    row: 22,
    class: 'shim',
    note:
      'Identity rules follow the native provider rules: a sign-in links to an existing user by verified email. ' +
      'Providers that never gave an email (the old plugin invented an address ending in @strapi.io for Instagram and ' +
      'Reddit) are listed by the dry-run, and their users need to be checked by hand.',
  },
  {
    row: 23,
    class: 'shim',
    note:
      'Custom providers added with providers-registry.add have no adapter. Each one needs to be rewritten as a ' +
      'provider of the new plugin. The dry-run lists every custom provider it finds in the project.',
  },
  {
    row: 24,
    class: 'must-keep',
    note:
      'The refresh routes answer 404 unless compat.refresh.enabled is true; the codemod sets it from jwtManagement. ' +
      'Each refresh creates a new session and ends the old one, so a request in flight with the old token gets a ' +
      '401 and the front end retries after refreshing.',
  },
  {
    row: 25,
    class: 'shim',
    note:
      'UP_CONFIG_MAP lists each old config key and where it goes. jwtSecret, jwt.* and the refresh settings become ' +
      'compat.legacyJwt and compat.refresh. jwtManagement becomes compat.refresh.enabled. The session lifespans, ' +
      'jwt.expiresIn, ratelimit, callback.validate and validationRules.validatePassword are not honored: sessions ' +
      'follow the new session settings, rate limits follow the new rate limits, callback.validate is replaced by ' +
      'trusted origins and password rules live on the Sign-in page. The per-email rate limit bucket is gone; the ' +
      'account lockout replaces it for sign-in.',
  },
  {
    row: 26,
    class: 'must-keep',
    note:
      'The old per-email bucket is gone. Sign-in is protected by the account lockout and the per-address limit; ' +
      'there is no per-email limit on forgot-password or register. GraphQL mutations share the limits of the REST ' +
      'routes.',
  },
  {
    row: 27,
    class: 'must-keep',
  },
  {
    row: 28,
    class: 'must-keep',
    note:
      'A user with two-factor authentication gets an error from the GraphQL login, not a token. The ' +
      'UsersPermissions* type names are kept with compatibility mode on. Changing a password and reading me need a ' +
      'signed-in caller and no permission row, so a role can no longer be denied changePassword.',
  },
  {
    row: 29,
    class: 'shim',
    note:
      'The role mutations (create, update and delete a role) and the UsersPermissionsPermission type are not kept; ' +
      'roles are managed in the admin. A GraphQL client that manages roles needs to be rewritten. User create, ' +
      "update and delete still exist under the old names, with the new plugin's permission scopes.",
  },
  {
    row: 30,
    class: 'shim',
    note:
      '/api/users uses the core pagination, where the old plugin returned every user in one array; a front end that ' +
      'expected them all must page. Filters and populate on role need the role read permission granted to the ' +
      "caller's role, or they are refused or dropped. Writing role, confirmed, blocked or provider through " +
      '/api/users is refused, and a missing user answers 404 where the old plugin answered 204. Changing email through ' +
      'PUT /api/users/:id is refused too, naming the field: the old plugin allowed it, and here an address changes only ' +
      'through /change-email, which proves the new one belongs to the user. The Content Manager is not affected.',
  },
  {
    row: 31,
    class: 'major',
    note:
      '/api/users-permissions/roles and /permissions are not kept on the Content API. Roles and their permissions ' +
      'are managed in the admin. A front end or script that reads the roles list through the Content API needs ' +
      'another way to get it.',
  },
  {
    row: 32,
    class: 'shim',
    note:
      'The strapi-server extension contract (wrapping the auth factory, overriding controllers.user.*, pushing ' +
      'routes and policies) is not kept. The codemod flags every file that uses it, and each one is rewritten as an ' +
      'extension of the new plugin.',
  },
  {
    row: 33,
    class: 'shim',
    note:
      'The services of the old plugin (jwt.issue, jwt.verify, jwt.getToken, user.*, role.*, and getActions, ' +
      'getRoutes and template) are not kept under the old name. Custom code that calls them fails when the server ' +
      'starts, naming the missing service, so it cannot run unnoticed. The codemod flags each call.',
  },
  {
    row: 34,
    class: 'must-keep',
    note:
      'The migration rewrites the admin permissions held by existing admin roles: the roles, providers, advanced ' +
      'settings and email templates actions of the old plugin become the roles, providers and settings actions of ' +
      'the new one and the templates actions of the email plugin. The Content API role actions map as find, ' +
      'findOne, create, update, destroy to delete, count, and me to me.find. The old auth and connect actions are ' +
      'dropped, because compat routes need no permission row.',
  },
  {
    row: 35,
    class: 'shim',
    note:
      'Webhooks and Document Service middlewares run on every write path to users, including the ones that go ' +
      'through compatibility mode. Database lifecycles on the old user model must be moved to the new one by hand.',
  },
  {
    row: 36,
    class: 'major',
    note:
      'Not rebuilt: GET /users/:id answering 204 for a missing user (it answers 404), the jwt.issue sync/async ' +
      'duality, the development server writing JWT_SECRET into the environment file, the Documentation plugin ' +
      'override for the compatible routes (they do not appear in the generated spec), and a role update without ' +
      'permissions wiping them (roles are managed in the admin). Kept: register refusing deviceId, and a user whose ' +
      'role has no permissions getting 403, not 401.',
  },
];
