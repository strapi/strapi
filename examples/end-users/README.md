# End users example: Strapi

A Strapi application that signs people in with `@strapi/plugin-end-users` (Better Auth) and does not
install `@strapi/plugin-users-permissions`. It is the back end for [`../end-users-frontend`](../end-users-frontend),
a Vite + React app on another origin, so anyone testing the plugin has a front end to test with.

The plugin serves Better Auth's own endpoints under `/api/auth` (for example `POST /api/auth/sign-up/email`).

## Run it

From the root of the repository:

```bash
yarn install
yarn workspace @strapi/plugin-end-users build   # once, and after changing the plugin

cd examples/end-users
cp .env.example .env
yarn develop
```

Strapi is then on <http://localhost:1337>. Start the front end in a second terminal, see
[`../end-users-frontend`](../end-users-frontend/README.md):

```bash
cd examples/end-users-frontend
cp .env.example .env
yarn dev
```

## What is configured

- [`config/server.ts`](config/server.ts) sets `url`, the server's public address. The plugin builds every absolute
  URL on it (cookies, redirects, the links in emails). Left unset it falls back to the address Strapi derives from
  `host` and `port`, and logs a warning in production.
- [`config/plugins.ts`](config/plugins.ts) turns the plugin on with `END_USERS_SECRET` (it signs the sessions),
  `trustedOrigins` (the front end's origin, gating Better Auth's `Origin` check and the redirect URLs it sends) and
  `cookies.crossSite: true` (`SameSite=None; Secure`, so a front end on another site gets the session cookie).
- [`config/middlewares.ts`](config/middlewares.ts) lets the front end's origin through `strapi::cors`, with
  credentials, so the browser sends and stores the cookie.

`FRONTEND_URL` (in `.env`, comma-separated for more than one origin) feeds both. Browsers accept a
`SameSite=None; Secure` cookie over plain http on `localhost` only: any other host needs https.

The same trusted origins guard the Content API: a write that is signed in by the cookie (such as `POST /api/articles`
or `PUT /api/users/me/profile`) is refused with a 403 `ORIGIN_NOT_TRUSTED` unless its `Origin` is in `trustedOrigins`
(here, `FRONTEND_URL`). A request that sends `Authorization: Bearer` is not checked.

Bearer mode needs none of the cookie settings: the front end keeps the token Strapi returns in the
`set-auth-token` header and sends it back in `Authorization`.

## Articles, profile fields and roles

The example has something to try the plugin on:

- **Articles.** [`src/api/article`](src/api/article) is an ordinary collection type (`title`, `body` as markdown,
  `internalNotes`, with draft and publish) with the usual core router, controller and service, at `/api/articles`. Its
  `author` is a one-way relation to `plugin::end-users.user`; the plugin refuses a relation to the user that has an
  inverse side, so the user never gains an `articles` attribute. Authors own their articles: the permission engine
  stamps the signed-in user as the `author` of what they create, and the `is-owner(author)` condition on the
  Authenticated role is what lets them update, delete, read the drafts of and publish only their own.
- **Profile fields.** The end-user type is locked, so a project's own data goes on the profile type.
  [`src/extensions/end-users/content-types/profile/schema.json`](src/extensions/end-users/content-types/profile/schema.json)
  adds `company` (string) and `newsletter` (boolean, default `false`). A schema file replaces the profile's whole
  attribute list, so it repeats the plugin's `user` attribute exactly as the plugin ships it.
- **Sign-up fields.** [`src/seed.ts`](src/seed.ts), run by `bootstrap` in [`src/index.ts`](src/index.ts), sets the
  plugin's `registrationFields` to `company` and `newsletter` through `service('settings')`, so a sign-up may send
  them and Strapi writes them to the new user's profile.
- **Roles.** [`seed/roles/*.json`](seed/roles) are role files in the format the roles admin API exports and imports.
  The same bootstrap step goes through the plugin's `role` and `permission` services:

  | File                                                  | What the seed does with it                                                                                                                                                                                                                                  |
  | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | [`public.json`](seed/roles/public.json)               | Public may `find` and `findOne` articles, every field but `internalNotes`                                                                                                                                                                                   |
  | [`authenticated.json`](seed/roles/authenticated.json) | Authenticated reads the same, and `create`s (the `author` is stamped), `update`s, `delete`s, reads the drafts of and `publish`es articles under `is-owner(author)`; it may write `title` and `body` only. It may also `find` the end user who is the caller |
  | [`editor.json`](seed/roles/editor.json)               | a custom Editor role: the same actions on anyone's articles, every field (`internalNotes` included) and no condition, imported with `fromFile`, so its rows are checked at every first start                                                                |

  The Authenticated role may `find` the end-user type under `is-self`, which only ever matches the caller: it is how
  the front end populates `author` and learns which articles are the caller's own (everyone else's `author` comes
  back empty).

  Public and Authenticated exist from the plugin's first start, and a role file cannot create them, so their files
  add permissions to the roles that are there. A user holds several roles at once and their permissions add up: give
  someone the Editor role by adding it to their roles in the Content Manager.

A new article is a draft. The front end creates it with `?status=draft`; a `POST` without a status is published at
once when the caller may publish it (here, as its author) and is a draft otherwise.

Starting again changes nothing, and what an administrator changed stays: the sign-up fields are set only while the
list is empty, Public and Authenticated get their permissions only while neither holds one on articles, and Editor is
imported only while no role is called Editor. The flip side is that a list emptied on purpose, or article permissions
taken from both built-in roles, come back on the next start. Delete `.tmp/data.db` to start from the seed again.

**A database seeded before articles had an author, drafts and internal notes keeps its old rows.** The seed only fills
roles that hold no permission on articles, so Public and Authenticated keep what they had (every field, no condition,
and no `update`, `publish` or `read-drafts` for the Authenticated role). Delete `.tmp/data.db` to start over, or
change the rows in the Strapi admin.
