# Strapi End Users

This plugin adds authentication for the end users of your application (sign-up, sign-in, sessions, roles and
permissions), built on [Better Auth](https://www.better-auth.com).

## Route policies

Four policies gate a project's own REST routes on the signed-in end user:

| Policy                               | Config                                       | Refuses with              |
| ------------------------------------ | -------------------------------------------- | ------------------------- |
| `plugin::end-users.is-authenticated` | none                                         | `AUTHENTICATION_REQUIRED` |
| `plugin::end-users.has-role`         | `{ roles: string[], mode?: 'any' \| 'all' }` | `ROLE_REQUIRED`           |
| `plugin::end-users.is-verified`      | none                                         | `EMAIL_NOT_VERIFIED`      |
| `plugin::end-users.has-two-factor`   | none                                         | `TWO_FACTOR_REQUIRED`     |

```ts
// src/api/report/routes/custom-report.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/reports/summary',
      handler: 'report.summary',
      config: {
        policies: [
          'plugin::end-users.is-verified',
          { name: 'plugin::end-users.has-role', config: { roles: ['Editors', 'Reviewers'] } },
        ],
      },
    },
  ],
};
```

`has-role` names roles by name or `documentId`; `mode: 'any'` (the default) needs one of them, `mode: 'all'` every
one. A `has-role` with no roles stops the start. A refusal is a 403 whose `error.name` is `PolicyError` and whose
`error.details.code` is the code above. A caller who is not signed in, an API token included, is refused with
`AUTHENTICATION_REQUIRED` by all four. The route still needs its action granted to the roles that call it, and it must
not set `auth: false`, since then nobody is signed in. GraphQL does not run route policies, so a rule that must hold
on both APIs belongs in a condition.

## Moving a project from Users & Permissions

The move works the same on Strapi Cloud and on a self-hosted project. No step needs a command. What you change reaches
production through your repository and a deploy, and what you need to read is shown in the admin panel.

1. Back up the production database. The migration copies and rewrites user data, and once the old tables are cleaned up
   a backup is the only way back.

2. Add `@strapi/plugin-end-users` to the project and set the migration to check only, in `config/plugins.ts`:

   ```ts
   export default ({ env }) => ({
     'end-users': {
       enabled: true,
       config: {
         migration: {
           fromUsersPermissions: 'check',
         },
       },
     },
   });
   ```

   Leave `users-permissions` as it is and deploy. In check mode the plugin stays dormant. It creates no table, answers
   no Content API route and writes nothing but its report, so Users & Permissions keeps serving your users. The start
   is refused if Users & Permissions is not loaded, because Strapi would drop its tables.

3. In the admin panel, open Settings, then End users, then Advanced, and read the Migration section on the environment
   that holds the data. It shows the counts of users, roles and permissions, and a list of items. An item marked
   Action needs a decision from you; Info only tells you what will happen.
   Typical items are users whose email or username is the same apart from letter case, providers that need a secret
   entered, and edited email templates that use expressions which cannot be carried over. Fix what the list asks for,
   deploy if the fix is in code or config, and select Check again until nothing is left that you did not expect. You
   can download the report as a file. It holds ids and counts, never an email address, name or secret.

   Two keys change how the migration treats your data, and both are read from `config/plugins.ts` only:

   ```ts
   migration: {
     fromUsersPermissions: 'check',
     // 'keep-oldest' (the default) keeps the oldest user of each duplicate group and rewrites
     // the others; 'abort' stops the migration instead
     duplicates: 'keep-oldest',
     // The sign-up fields to keep. Leave it out to decide from the profile
     registrationFields: ['firstName', 'lastName'],
   },
   ```

4. In development, open the Project files part of the same section. It shows the change to each schema file and to
   `config/plugins.ts`. For the schema files it shows the old and the new text side by side. For `config/plugins.ts` it
   shows the end-users block that will be set, not the whole file, so read your own file next to it. Select Write the
   files to apply the changes. The files are
   written only by a development server that reloads (`NODE_ENV` set to `development` and `autoReload` on), and only
   inside `src/` and `config/`; the write is all or nothing. On any other server, or if the config file cannot be edited
   automatically, the same page gives you the config block and the line that turns Users & Permissions off, to copy by
   hand. Either way, the development database migrates when the server restarts with the new config.

   The plan makes three changes.

   - Attributes you added to the Users & Permissions user move to the end-users profile. The schema file of the old user
     type is deleted. Users & Permissions' own attributes stay behind.
   - Your end-users entry in `config/plugins.ts` gets `compat.usersPermissions: true`, the legacy token settings and
     `END_USERS_SECRET`, and Users & Permissions is turned off. An entry you already have is merged into, not replaced.
     Every key you set in it stays, including the `duplicates` and `registrationFields` choices from step 3.
   - Code that names the old plugin is listed, and not changed.

5. Review the diff and the code findings, then change the code by hand. Each finding names a file and a line:

   | Finding                                                           | What to use instead                                                                                     |
   | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
   | `plugin::users-permissions.user` named in code                    | `plugin::end-users.user` for account fields, `plugin::end-users.profile` for your own fields            |
   | A lifecycle subscription on the old user                          | Subscribe to `plugin::end-users.user` (account fields) or `plugin::end-users.profile` (your own fields) |
   | `strapi.plugin('users-permissions')` services                     | The services of the end-users plugin                                                                    |
   | A custom login provider registered with `providers-registry`      | Register it as an end-users provider                                                                    |
   | A `strapi-server` extension of `users-permissions`                | Move what it does to the end-users plugin or to your own routes                                         |
   | A relation to `plugin::users-permissions.role`                    | End-users has its own roles; the relation needs a decision                                              |
   | A relation that was the inverse side of one owned by another type | The inverse is not moved; the owning side now targets the end-users user without an inverse             |
   | An attribute on both the old user and the profile                 | The profile's is kept and the user's is not moved                                                       |
   | A `config/env/<name>/plugins` file                                | Not changed; apply the same edits by hand                                                               |

   The config findings point at settings that are not carried over, with a note on what replaces each one. For example,
   `validationRules.validatePassword` becomes the password rules under Settings, and `callback.validate` becomes
   `compat.connect.callbacks`.

6. Set `END_USERS_SECRET` where the project runs, to a long random string (the plugin warns below 32 characters). It signs the new
   sessions. On Strapi Cloud that is an environment variable of the project. Set `JWT_SECRET` to the secret Users &
   Permissions signs its tokens with, so tokens issued before the move keep working. In development the plugin generates
   a secret and stores it in `.env` when none is set. Any other `NODE_ENV` (production, staging, test) refuses to start
   without one, or with a published placeholder such as the one in an `.env.example`.

7. Commit the files and deploy with one instance running, as Strapi's own migrations need. The migration runs while
   the application starts, before the database schema is synchronized. If a second instance starts during that time, it
   waits for the first to finish. If a start stops partway, for example because the process was killed, the next start
   picks up where it stopped, after waiting up to 15 minutes for the stopped start's hold on the migration to expire.

   A project with 100,008 users migrated in about 87 seconds on SQLite and in about 166 seconds on Postgres 17, both
   on the same 16-core workstation, start to finish. The rollback on SQLite took about 2 seconds. Time it on a copy of
   your own data before you plan a window, because the figures depend on the database server and its disk. For a
   database with a measured rate, the Migration section also shows an estimate. Read it as a lower bound: the rates
   come from a fast workstation.

   After the migration, the end-users part of your `config/plugins.ts` reads like this. Your file also holds the keys
   you set yourself, and the Users & Permissions entry is switched off.

   ```ts
   export default ({ env }) => ({
     'users-permissions': { enabled: false },
     'end-users': {
       enabled: true,
       config: {
         secret: env('END_USERS_SECRET'),
         migration: {
           fromUsersPermissions: true,
         },
         compat: {
           usersPermissions: true,
           legacyJwt: {
             secret: env('JWT_SECRET'),
             until: null,
           },
         },
       },
     },
   });
   ```

   A start is refused, with a message that says why, when `fromUsersPermissions` is `true` and the end-users tables
   already hold users, and when the old tables exist and the key is not set. If a start stops partway, deploy again: the
   migration resumes from the step it reached.

   If the migration fails the same way on every start, undo it by setting `migration.rollback: true` in
   `config/plugins.ts` and deploying. A rollback that was interrupted is finished with the same key; until then the
   start says so and refuses. After a rollback the project can start in check mode again, by setting
   `fromUsersPermissions` back to `'check'` and turning `migration.rollback` off.

8. Watch the Advanced page. The Migration section now shows the status of the migration and the items to resolve. Mark
   an item resolved once you have dealt with it; providers, templates and rewritten addresses resolve themselves when
   you do what they ask. While compat is on, a Legacy token use block counts the requests that still arrive with a
   token Users & Permissions issued, and when the last one came.

9. Set `compat.legacyJwt.until` from those counts: a date (`'2027-01-31'` lasts to the end of that day, in UTC) after
   which old tokens are no longer accepted. Move your front ends to the native endpoints while it runs. When the counts
   show no legacy token use, set `compat.usersPermissions` to `false` and deploy. The first start with compat off
   cleans up. It drops the staging tables the migration carried over, the columns Users & Permissions kept on the user
   and the custom columns the migration copied into profiles. A column it did not copy stays, and the report lists it
   as an item for you to resolve. After the cleanup, the way back is a backup.

   With compat on, the old routes (`/api/auth/local`, `/api/auth/local/register` and the rest) keep answering as
   Users & Permissions did, and a provider keeps its `/api/connect/<id>/callback` address, so nothing changes at the
   identity provider.

### Rolling back

Before compat is turned off and the cleanup has run, the migration can be undone.

1. Set `migration.rollback: true` and deploy. The rollback runs while the application starts, in one transaction, and then
   stops the start with the steps that follow. A restart that finds `rollback` still set after a rollback is refused
   in the same way, so a process manager cannot bring the project up on empty tables.
2. Revert the commit that switched the project to end-users, so Users & Permissions is loaded again.
3. Remove `migration.rollback` and deploy.

Everything the migration moved comes back from its current state, including users created after the move and the
spelling of each username. Some things cannot come back, and the log counts them. Profile attributes added after the move
and provider accounts beyond a user's first stay behind, and so do roles beyond a user's first, since Users & Permissions
gives a user one role. Changes to role permissions made after the move are lost too, because the permissions staged
before it come back. Settings, provider and email template edits made after the move are not carried back either, and
Users & Permissions goes on with the ones it had. When a profile permission of an admin role cannot be merged into the
matching user permission without granting more than the user permission did, it is dropped and the log names the fields
to grant again in the admin. A rollback is refused once compat is off or the cleanup has run, unless an earlier rollback was interrupted, which it
finishes. Otherwise restore the backup instead.

To migrate again after a rollback, switch the project to end-users again with `migration.fromUsersPermissions` set to `true`; the old tables are still in place.

### What is not carried over

- Pending password reset tokens. Those users ask for a new reset. Pending confirmation links keep working while compat
  is on.
- The Content Manager layout of the user type (list columns and the edit view). Set it up again in the admin panel.
- The per-email rate limit of Users & Permissions. Sign-in is protected by the account lockout and a per-address limit;
  forgot-password and register have no per-email limit.
- Providers registered through `providers-registry`. They are listed as items, and you register them as end-users
  providers.
- Signing in through a provider to an existing account with the same address when the provider does not say the address
  is verified (Facebook, VK, LINE and Spotify never do). That sign-in is refused until an administrator turns on Trust
  for account linking for the provider (Settings, End users, Providers). Users who signed up with Facebook under Users &
  Permissions, had confirmed their address and were not blocked are the exception, and Facebook is the only provider that
  is. It does not say whether an address is verified, but according to a third-party integration article and Meta's
  documentation, Facebook returns no address that it has not confirmed. The plugin relies on that. While compatibility
  mode is on, the migration records a pending link for each of these users, and their first sign-in with Facebook, with
  the address they have here, links it to their account, once. The links exist only while compatibility mode is on: a
  migration that runs with it off records none, and the first start with it off removes any that remain.
- Extensions in `strapi-server` for `users-permissions`. Move what they do to the end-users plugin or to your own routes.
- `GET /api/users/:id` answering 204 for a missing user. It answers 404.
- The GraphQL role mutations (create, update and delete a role) and the `UsersPermissionsPermission` type. Roles are
  managed in the admin panel.
- Changing `email` through `PUT /api/users/:id`. The request is refused, and the address changes through
  `/change-email`, which proves the new one belongs to the user.
- Editing their own profile, for the users of a role that could not update users in Users & Permissions. To let a
  role's users edit their profile, grant it in the admin panel (Settings, End users, Roles).
