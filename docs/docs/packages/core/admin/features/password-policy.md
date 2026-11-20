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

The settings page can only make the policy stricter than a floor set in the server configuration.
See [Floor](#floor).

`admin:create-user` checks the password after `load()`, because the policy lives in the database. At the interactive prompt, an invalid password is therefore reported after the last question: the command then asks for the password again and keeps the other answers. With `--password`, it exits with an error.

## Rules

| Rule                      | Default | Notes                                                                                                        |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `minLength`               | `8`     | Between 8 and 64 characters.                                                                                 |
| `requireLowercase`        | `true`  | Any Unicode lowercase letter (`\p{Ll}`).                                                                     |
| `requireUppercase`        | `true`  | Any Unicode uppercase letter (`\p{Lu}`).                                                                     |
| `requireNumber`           | `true`  | Any Unicode decimal digit (`\p{Nd}`).                                                                        |
| `requireSpecialCharacter` | `false` | Any character that is neither a letter nor a decimal digit (`[^\p{L}\p{Nd}]`), so `!`, a space or `²` count. |

The 72-byte bcrypt limit is always enforced on top of the policy and is not configurable. The
service reports it as the `maxBytes` rule.

`minLength` counts Unicode code points (`Array.from(password).length`), on the server and in the
admin panel, so a character outside the Basic Multilingual Plane such as `𝐀` counts once. An emoji
built from several code points counts as several characters. The byte limit counts UTF-8 bytes. Most Cyrillic, Greek or Arabic letters take 2 bytes and CJK characters 3, so a high
minimum cannot be met with these scripts alone: from 37 characters for Cyrillic, from 25 for CJK.
Mixing in ASCII characters lowers the byte count.

Only `null` and `undefined` count as an absent password. An empty string breaks the policy.

The defaults are the rules Strapi enforced before the policy became configurable, with one
relaxation: the character classes are Unicode-aware now. Before, only `[a-z]`, `[A-Z]` and `\d`
counted, so a password such as `Пароль123` or `Password١٢` was rejected; it is accepted now. Apart
from that, an existing project behaves as before until an administrator changes the policy.

## Floor

`config/admin` can set a `passwordPolicy` object with the same keys as the policy. It is the
minimum the settings can only make stricter: the effective policy takes, rule by rule, the higher
`minLength` and every rule either side requires. In the floor, `false` means "not imposed": the
settings may still turn the rule on. Keys left out keep the default policy, so a project without
`passwordPolicy` has the default policy as its floor. Out of the box, the settings page can only
raise the minimum length and require a special character; loosening the other rules takes a
deploy:

```js
// config/admin.js
module.exports = ({ env }) => ({
  // ...
  passwordPolicy: {
    minLength: 12,
    requireUppercase: false,
  },
});
```

- `getFloor()` reads and validates it. An unknown key, a `minLength` outside 8–64 or a rule that is
  not a boolean throws. The admin bootstrap calls it, so an invalid floor stops the start.
- `getPolicy()` raises the stored policy to the floor on every read. A stored policy below the
  floor (saved before the floor was raised, or brought by a data transfer) never weakens it.
- `updatePolicy()` throws a `ValidationError` (HTTP 400) for a `minLength` below the floor or for
  turning off a rule the floor requires. It stores only what goes beyond the floor: rules the floor
  requires are stored as off and a minimum length at the floor as 8. So when a deploy lowers the
  floor, the policy loosens without anybody saving the settings again.
- Raising the floor does not re-check existing passwords, like any stricter policy.
- `GET /admin/password-policy` returns the floor in `meta.floor`. The settings page uses it as the
  lowest minimum length and shows the rules it requires as checked and disabled, with the hint
  "Required by the server configuration (passwordPolicy in config/admin)". Clients get the default
  floor when `meta` is missing.

## Storage and API

The policy is stored in the core store (`strapi.store({ type: 'core', name: 'admin' })`) under the
`password-policy` key. Only the known keys with the expected type are read back, on top of the
floor, so a policy saved by an older version keeps working. A stored `minLength` outside 8–64
(for example from an import or a hand-edited row) is clamped to these bounds, and `updatePolicy`
throws a `ValidationError` for one, whoever calls it.

Data transfer (`strapi import`, `strapi transfer`, `strapi export`) includes the core store with
the configuration. The destination then takes what the source stored above the source's floor, on
top of its own floor. A rule the source's floor required is not in the stored row, so it only
applies on the destination if the destination's floor requires it too. If the source has no stored
policy, the destination falls back to its floor, without a warning. Pass
`--exclude config` to keep the destination's policy.

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

- [`server/src/services/password-policy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/services/password-policy.ts): `getFloor`, `getPolicy`, `updatePolicy`,
  `getViolations(password, policy)` and `isCompliant(password, policy)` (pure; `policy` is
  required, pass the result of `getPolicy()`).
- [`server/src/validation/common-validators.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/validation/common-validators.ts): the shared `password` yup
  validator fetches the policy at validation time and reports one error per broken rule, with the
  same messages as the former hard-coded chain (`<path> must be at least 8 characters`, ...). If
  the policy cannot be read, it logs the error and fails validation. It does not fall back to the
  defaults, which could accept a password the configured policy forbids.
- [`server/src/services/user.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/services/user.ts): `assertPasswordIsValid(password)` reads the
  policy, throws a `ValidationError` listing the broken rules, and lets a store error through
  unchanged. The CLI commands go through it, so a database failure exits instead of asking for
  another password.
- [`server/src/validation/password-policy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/validation/password-policy.ts): zod schema of the `PUT` body.

Other plugins can reuse `strapi.service('admin::password-policy')` to apply the same rules to
their own users: pass the result of `getPolicy()` to `getViolations`.

## Admin panel implementation

- [`admin/src/utils/passwordPolicy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/passwordPolicy.ts): `createPasswordSchema(policy)` builds the yup rules used by
  the registration, reset-password, profile and user edit forms; `formatPasswordPolicyHint` builds
  the sentence displayed under password inputs.
- [`admin/src/hooks/usePasswordPolicy.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/hooks/usePasswordPolicy.ts): fetches the policy (`useGetPasswordPolicyQuery`) and
  memoises the schema and hint. While loading or when the request fails, it validates against the
  minimum every policy requires (8 characters and the byte limit), so a form never rejects a
  password the server would accept; the server checks the other rules. No hint is shown while
  loading. The hint of the default policy uses the former `Auth.form.password.hint` key, so it stays
  translated. The invite registration form fetches the policy again when the server rejects the
  password, because an administrator may have changed it since the page loaded.
- [`admin/src/pages/Settings/pages/PasswordPolicy/PasswordPolicyPage.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/pages/Settings/pages/PasswordPolicy/PasswordPolicyPage.tsx): the settings page. A cleared minimum length shows the
  required error, and the preview of the hint only renders a minimum length that can be saved.
