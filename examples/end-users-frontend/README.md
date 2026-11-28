# End users example: front end

A small Vite + React app that signs people up and in against [`../end-users`](../end-users), a Strapi application
using `@strapi/plugin-end-users`. It runs on its own origin (`http://localhost:5173`, Strapi is on
`http://localhost:1337`), which is what a real front end does, and it uses the Better Auth client with
[Better Auth UI](https://better-auth-ui.com) (shadcn components).

| Route                               | Shows                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/`                                 | whether you are signed in, and how the page talks to Strapi                                                   |
| `/sign-up`, `/sign-in`, `/sign-out` | the Better Auth UI forms; sign-up also asks for a company and the newsletter                                  |
| `/two-factor`                       | the code prompt a sign-in goes to when two-factor is on (cookie mode only)                                    |
| `/account`                          | your profile (name, avatar), your Strapi profile (company, newsletter), change password, sessions, two-factor |
| `/articles`                         | the articles anyone can read, and a form to write one when you are signed in                                  |

## Run it

Start Strapi first (see [`../end-users`](../end-users/README.md)), then, from the root of the repository:

```bash
yarn install
cd examples/end-users-frontend
cp .env.example .env
yarn dev
```

Open <http://localhost:5173>.

## Cookie or Bearer

The front end proves who you are one of two ways:

- `cookie`: the session cookie Strapi sets. The browser stores it and sends it with every request.
- `bearer`: no cookie. Strapi returns the session token in a `set-auth-token` header, the app keeps it in
  `localStorage` and sends it as `Authorization: Bearer <token>`. Any script on the page can read that storage, which
  is the price of not using a cookie.

Choose with `VITE_AUTH_MODE` in `.env`, or per browser tab with `?mode=cookie` or `?mode=bearer` on any address
(`http://localhost:5173/sign-in?mode=bearer`). The home page says which one is in use. A session made in one mode does
not carry over to the other: sign in again after switching.

The client is in [`src/lib/auth-client.ts`](src/lib/auth-client.ts), the provider and routes in
[`src/App.tsx`](src/App.tsx).

**Cookie mode across sites and Safari.** When this app and Strapi are on different sites (for example
`127.0.0.1:5173` and `localhost:1337`, or two unrelated domains), the session cookie is a third-party cookie
(`SameSite=None; Secure`, the Strapi example's `cookies.crossSite`). Safari blocks those outright, and any browser
set to block third-party cookies does too: sign-in appears to work and the next request is signed out. Use Bearer
mode for such a deployment, or put both on the same site (`app.example.com` and `api.example.com`) where Strapi's
default `SameSite=Lax` cookie is enough and `crossSite` is not needed. Bearer mode is unaffected.

## Profile fields, sign-up and articles

- **Sign-up fields.** `company` and `newsletter` are Better Auth UI's
  [additional fields](https://better-auth-ui.com) (`additionalFields` on the provider, with `signUp` set), declared
  in [`src/App.tsx`](src/App.tsx). Better Auth UI 1.7.32 adds each to the body of `POST /api/auth/sign-up/email` as an
  extra key next to `name`, `email` and `password`; the end-users plugin accepts the keys named in its
  `registrationFields` setting (the Strapi example sets it to these two) and writes them to the new user's profile.
  They are `profile: false`, so Better Auth UI's own profile card, which saves to the Better Auth user, leaves them
  alone.
- **Profile card.** On `/account`, [`src/components/profile-card.tsx`](src/components/profile-card.tsx) reads
  `GET /api/users/me/profile` and saves `PUT /api/users/me/profile` (`{ data: { company, newsletter } }`).
  [`src/lib/api.ts`](src/lib/api.ts) makes those calls with the Better Auth client's own fetch, so they carry what
  the sign-in used: the cookie in cookie mode, `Authorization: Bearer` in Bearer mode.
- **Articles.** `/articles` lists `GET /api/articles` (the seed lets the Public role read the published ones, without
  their `internalNotes`). Each shows a Draft or Published badge. A signed-in user writes an article (`POST
/api/articles?status=draft`: a new article is a draft, and Strapi stamps the signed-in user as its `author`), edits
  it, and publishes it with `PUT /api/articles/:documentId?status=published`: all of that on the articles they own
  (the seed's `is-owner(author)` condition), and nobody else's. "My drafts" reads `?status=draft` with the
  `never-published-document` publication filter, which needs `read-drafts`, and the page keeps it in the address
  (`?view=drafts`). The page reads `GET /api/end-users/permissions/me` to show only what the role can do: no form
  without `create`, no "My drafts" without `read-drafts`, no Edit or Publish without `update` or `publish`. That list
  says which rows a role holds, not what a condition lets through, so a held condition only means "your own".
  Strapi has the last word: a request the page should not have sent is refused all the same.
  A database seeded before the author was stamped keeps its old rows (the seed only fills roles that hold no
  permission on articles): delete it to start over, see [`../end-users`](../end-users/README.md).

## What is left out, and why

- Two-factor in Bearer mode. Signing in as a user with two-factor on sets a short-lived cookie that the code
  prompt then needs, and Bearer mode never has cookies. Enrolling works, signing in again would not, so the card is not
  shown (nor the code prompt).
- A screen for changing the email. Forgot password and email verification work: the example Strapi writes each email
  to `examples/end-users/.tmp/emails/<timestamp>-<to>.json` instead of sending it (a small provider in its
  `providers/` folder), so open the file and follow the link. Email verification is a setting in the admin
  (Settings > End users > Sign-in), off by default.
- Social sign-in, passkeys, magic links.

## Tests

[Playwright](https://playwright.dev) drives a real browser through sign-up, sign-in and the account page in both modes,
twice: on `http://localhost:5173` (another origin than Strapi, but the same site) and on `http://127.0.0.1:5173` (another
site as well, the case `cookies.crossSite` is for). It also enrols a user in two-factor and signs in with a code, and runs the account flows (verify the email, reset a
forgotten password, change the email) by reading the emails Strapi wrote.

The tests run the Strapi example on the plugin's built code, so build the plugin first, from the root of the
repository, as for [the Strapi example](../end-users/README.md#run-it):

```bash
yarn workspace @strapi/plugin-end-users build   # once, and after changing the plugin

cd examples/end-users-frontend
yarn playwright install chromium   # once
yarn test:e2e
```

The specs: sign-up and sign-in (including the attributes of the session cookie), two-factor, the company and
newsletter on the profile, and writing and reading articles, each in both modes.

`yarn test:e2e` starts Strapi (`yarn develop` in `../end-users`, port 1337) and this app (port 5173, listening on
`127.0.0.1`) itself, and stops them when done. Strapi gets its own database file (`.tmp/e2e.db`, so your development
data is left alone), deleted before every run so each one starts empty and Strapi's bootstrap seeds the roles again
(`e2e/reset-database.mjs`), and a fixed, public `END_USERS_SECRET` that is only fit for tests. Nothing may be running
on ports 1337 or 5173: a Strapi started earlier would trust only the origins it was given, and a Vite started earlier
may not listen on `127.0.0.1`.

## About the components

`src/components/auth` and `src/components/ui` come from the Better Auth UI registry for shadcn (`@better-auth-ui/auth`,
`@better-auth-ui/settings`, `@better-auth-ui/user-button` and `@better-auth-ui/two-factor`, version 1.7.32), added with
`npx shadcn@latest add`; re-adding one over an existing file needs `-o`. A few pieces the example does not use
(settings tabs, change email, linked accounts, the username plugin) are not copied.

The root `package.json` pins `@types/react` to 18 for the admin panel. This app runs React 19, so `tsconfig.app.json`
maps `react` to the `@types/react-19` alias in `devDependencies`. `yarn build` runs the type check.
