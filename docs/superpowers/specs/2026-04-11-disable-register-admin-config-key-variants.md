# Config key variants for disabling `register-admin`

**Status:** Open — pending consultation with the Strapi team.
**Current working choice:** `admin.register.enabled` (used in implementation until the team picks a final name).

## Context

Strapi exposes a public endpoint `POST /admin/register-admin` handled by the
`registerAdmin` controller in
`packages/core/admin/server/src/controllers/authentication.ts`. It lets the
very first user of a fresh install claim the super-admin slot on a
first-come-first-served basis. Until an operator actually completes that flow,
anyone who reaches the admin URL can take over the instance.

We want a configuration flag under the `admin.*` namespace that, when set to
`false`, disables this flow entirely (both the HTTP endpoint and the
corresponding frontend route). Operators who disable it are expected to
pre-provision the first admin through the existing `strapi admin:create-user`
CLI command.

This document lists every name we considered so the Strapi team can pick the
final one before release.

## Naming constraints

1. Must live at the top level under the `admin.*` namespace, mirroring the
   existing `admin.forgotPassword` shape (not nested under `admin.auth.*`,
   since `forgotPassword` isn't either).
2. Should not repeat "admin" inside the key itself — `admin.` already conveys
   that context.
3. Must be unambiguous: `register-admin` (the self-service first-admin flow)
   and `register` (invited user completing registration via a server-issued
   token) are two distinct endpoints; the name should make clear which one is
   being disabled.
4. Ideally leaves room for future knobs in the same namespace
   (`admin.<name>.something`) without a rename.

## Variants considered

### 1. `admin.register.enabled`

- **Pros:** Short, reads naturally, mirrors `admin.forgotPassword`.
- **Cons:** Ambiguous — the backend has _two_ endpoints, `/register` and
  `/register-admin`. A reader may reasonably expect this flag to disable
  `/register` (the invited-user flow) rather than `/register-admin`.
- **Used as:** current working default until the final name is chosen.

### 2. `admin.registerAdmin.enabled`

- **Pros:** Maps 1:1 onto the endpoint name and the controller method.
- **Cons:** Repeats "admin" inside a key that's already under `admin.*`; the
  resulting `admin.registerAdmin` reads awkwardly.

### 3. `admin.auth.register.enabled`

- **Pros:** Groups registration under an `auth` sub-namespace.
- **Cons:** Inconsistent with `admin.forgotPassword`, which lives at the top
  level rather than under `admin.auth.*`. Picking this would fragment the
  shape of `admin.*` config.

### 4. `admin.selfRegistration.enabled`

- **Pros:** "Self-registration" is a widely understood auth term and captures
  exactly why `register-admin` is risky — it's self-provisioning with no
  invite or prior authorization. Cleanly distinguishes from the invited
  `/register` flow.
- **Cons:** Slightly longer. "Self-registration" isn't a phrase Strapi already
  uses anywhere else in docs or config.

### 5. `admin.firstAdmin.enabled`

- **Pros:** Literal: this flag controls creation of the first admin.
- **Cons:** Reads oddly as a boolean — "is the first admin enabled?" sounds
  like it's asking about the existence of the first admin user rather than
  the registration flow. Also doesn't scope well for future knobs
  (`admin.firstAdmin.*` implies properties of an actual user).

### 6. `admin.initialRegistration.enabled`

- **Pros:** Clear that it's about the first/initial registration event, not
  ongoing invited-user registration.
- **Cons:** "Initial" is less standard than "self" in auth terminology.
  Slightly verbose.

### 7. `admin.registration.enabled`

- **Pros:** Noun form reads slightly better than `admin.register.enabled`.
- **Cons:** Has the same ambiguity as #1 — a reader can't tell whether this
  disables self-registration or invited registration.

### 8. `admin.bootstrapAdmin.enabled` / `admin.initialAdmin.enabled`

- **Pros:** "Bootstrap" captures the one-time setup nature; "initial" is
  descriptive.
- **Cons:** Both repeat "admin" (violates constraint 2). "Bootstrap" may
  collide with Strapi's existing `bootstrap()` lifecycle concept.

## Recommendation

If the Strapi team wants maximum clarity and future-proofing,
`admin.selfRegistration.enabled` is the strongest option. If they prefer
brevity and are willing to accept the ambiguity (relying on docs to clarify
"self-registration of the first admin"), `admin.register.enabled` is the
shortest.

The implementation uses `admin.register.enabled` as a placeholder. Renaming is
a mechanical find-and-replace across a small surface area
(config read, types, docs) so the final choice can be made late.
