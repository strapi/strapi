---
title: Password policy
description: How the configurable password complexity rules for admin users work.
tags:
  - backend
  - frontend
  - rbac
  - security
---

## Summary

Administrators holding the `admin::password-policy.update` permission (super admins by default)
configure the complexity rules every admin user's password has to satisfy from
**Settings → Administration panel → Password policy**. The rules apply to:

- the first admin registration (`POST /admin/register-admin`) and invitation-based registration (`POST /admin/register`),
- password resets (`POST /admin/reset-password`),
- profile updates (`PUT /admin/users/me`) and user updates by an admin (`PUT /admin/users/:id`),
- the `strapi admin:create-user` and `strapi admin:reset-user-password` CLI commands.

Existing passwords are not re-checked: a stricter policy only applies when a password is set or changed.

`admin:create-user` checks the password after `load()`, because the policy lives in the database. An invalid password therefore fails after Strapi has loaded, not at the prompt.

## Rules

| Rule                      | Default | Notes                                               |
| ------------------------- | ------- | --------------------------------------------------- |
| `minLength`               | `8`     | Between 8 and 64 characters.                        |
| `requireLowercase`        | `true`  | Any Unicode lowercase letter (`\p{Ll}`).            |
| `requireUppercase`        | `true`  | Any Unicode uppercase letter (`\p{Lu}`).            |
| `requireNumber`           | `true`  | Any Unicode decimal digit (`\p{Nd}`).               |
| `requireSpecialCharacter` | `false` | Any character that is neither a letter nor a digit. |

The 72-byte bcrypt limit is always enforced on top of the policy and is not configurable.

Only `null` and `undefined` count as an absent password. An empty string breaks the policy.

The defaults are the rules Strapi enforced before the policy became configurable, so an existing
project behaves exactly as before until a super admin changes the policy.

## Storage and API

The policy is stored in the core store (`strapi.store({ type: 'core', name: 'admin' })`) under the
`password-policy` key. Only the known keys with the expected type are read back, on top of the
defaults, so a policy saved by an older version keeps working.

| Route                        | Access                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `GET /admin/password-policy` | Public: the registration and reset-password pages need it before login.             |
| `PUT /admin/password-policy` | `admin::isAuthenticatedAdmin` + `admin::hasPermissions` (`password-policy.update`). |

Access follows the regular RBAC model. Two actions are declared in the Settings section under the
"password policy" category of `server/src/config/admin-actions.ts`:

- `admin::password-policy.read`: see the settings page (the policy itself is public, see above);
- `admin::password-policy.update`: change it.

Any role can be granted them from **Settings → Roles**; the super admin role gets them
automatically like every other action. The admin panel lists them in
`ADMIN_PERMISSIONS_CE.settings['password-policy']`: the settings link and the page
(`Page.Protect`) require `read`, and the form is rendered read-only without `update`.

## Server implementation

- [`server/src/services/password-policy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/services/password-policy.ts): `getPolicy`, `updatePolicy`,
  `getViolations(password, policy)` (pure, ordered list of broken rules) and `isCompliant`.
- [`server/src/validation/common-validators.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/validation/common-validators.ts): the shared `password` yup
  validator fetches the policy at validation time and reports one error per broken rule, with the
  same messages as the former hard-coded chain (`<path> must be at least 8 characters`, ...). If
  the policy cannot be read, it logs the error and fails validation. It does not fall back to the
  defaults, which could accept a password the configured policy forbids.
- [`server/src/services/user.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/services/user.ts): `assertPasswordIsValid(password)` runs that
  validator and throws a `ValidationError` listing the broken rules. The CLI commands go through it.
- [`server/src/validation/password-policy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/validation/password-policy.ts): zod schema of the `PUT` body.

Other plugins can reuse `strapi.service('admin::password-policy')` to apply the same rules to
their own users.

## Admin panel implementation

- [`admin/src/utils/passwordPolicy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/passwordPolicy.ts): `createPasswordSchema(policy)` builds the yup rules used by
  the registration, reset-password, profile and user edit forms; `formatPasswordPolicyHint` builds
  the sentence displayed under password inputs.
- [`admin/src/hooks/usePasswordPolicy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/hooks/usePasswordPolicy.ts): fetches the policy (`useGetPasswordPolicyQuery`) and
  memoises the schema and hint, falling back to the defaults while loading.
- [`admin/src/pages/Settings/pages/PasswordPolicy/PasswordPolicyPage.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/pages/Settings/pages/PasswordPolicy/PasswordPolicyPage.tsx): the settings page.
