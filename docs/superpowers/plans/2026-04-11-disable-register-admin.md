# Disable `register-admin` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `admin.register.enabled` configuration boolean that, when `false`, disables the public "first super admin" self-registration flow at both the HTTP layer (`POST /admin/register-admin`) and the frontend route (`/auth/register-admin`).

**Architecture:** A single boolean config key under the `admin.*` namespace. The backend `registerAdmin` controller checks the flag first and throws `ApplicationError` when disabled. The `/admin/init` response carries the flag through to the frontend, which uses it in `AuthPage.tsx` to (a) suppress the auto-redirect to `/auth/register-admin` on fresh installs and (b) redirect direct visits to the register page back to login. The invited-user `/register` flow, SSO auto-registration, and forgot-password flows are untouched.

**Tech Stack:** TypeScript, Koa (backend), React + RTK Query (frontend), Jest (backend tests), Vitest/Jest + Testing Library + MSW (frontend tests).

**Spec:** [`docs/superpowers/specs/2026-04-11-disable-register-admin-design.md`](../specs/2026-04-11-disable-register-admin-design.md)
**Naming variants:** [`docs/superpowers/specs/2026-04-11-disable-register-admin-config-key-variants.md`](../specs/2026-04-11-disable-register-admin-config-key-variants.md)

---

## File Structure

**Backend:**

- **Modify** `packages/core/admin/shared/contracts/admin.ts` — add `registerEnabled: boolean` to `Init.Response['data']`.
- **Modify** `packages/core/admin/server/src/controllers/admin.ts` — include `registerEnabled` in the `init()` response.
- **Modify** `packages/core/admin/server/src/controllers/authentication.ts` — add guard at the top of `registerAdmin()` that throws when disabled.
- **Modify** `packages/core/admin/server/src/controllers/__tests__/admin.test.ts` — update `init` test to assert the new field.
- **Create** `packages/core/admin/server/src/controllers/__tests__/authentication.test.ts` — new test file covering the `registerAdmin` guard.

**Frontend:**

- **Modify** `packages/core/admin/admin/src/pages/Auth/AuthPage.tsx` — read `registerEnabled` and gate redirects on it.
- **Create** `packages/core/admin/admin/src/pages/Auth/tests/AuthPage.test.tsx` — new test file covering the routing branches.
- **Modify** `packages/core/admin/admin/tests/server.ts` — extend the `/admin/init` MSW handler so tests can override `hasAdmin` / `registerEnabled`.

Each file has a single, focused responsibility. No cross-cutting refactors.

---

## Task 1: Extend the `Init.Response` contract

**Files:**

- Modify: `packages/core/admin/shared/contracts/admin.ts`

- [ ] **Step 1: Add `registerEnabled` to the `Init.Response` type**

Open `packages/core/admin/shared/contracts/admin.ts` and locate the `Init` namespace (around line 17). Update it to:

```ts
export declare namespace Init {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      uuid: string | false;
      hasAdmin: boolean;
      menuLogo: string | null;
      authLogo: string | null;
      registerEnabled: boolean;
    };
    error?: errors.ApplicationError;
  }
}
```

- [ ] **Step 2: Verify the workspace still type-checks**

Run: `yarn workspace @strapi/admin run typecheck` (from the repo root).
Expected: Passes. If it fails because `controllers/admin.ts` no longer matches the contract, that is fine — it proves the contract is being enforced. Note the failure and proceed to Task 2, which fixes it.

- [ ] **Step 3: Commit**

```bash
git add packages/core/admin/shared/contracts/admin.ts
git commit -m "feat(admin): add registerEnabled to Init.Response contract"
```

---

## Task 2: Return `registerEnabled` from the `init` controller

**Files:**

- Modify: `packages/core/admin/server/src/controllers/admin.ts:44-66`
- Modify: `packages/core/admin/server/src/controllers/__tests__/admin.test.ts:33-49`

- [ ] **Step 1: Update the failing test in `admin.test.ts`**

Open `packages/core/admin/server/src/controllers/__tests__/admin.test.ts` and extend the existing `init` test (lines 33–49) so the assertions cover `registerEnabled`:

```ts
test('Returns the uuid, hasAdmin, and registerEnabled flag', async () => {
  const result = await adminController.init();

  expect(global.strapi.config.get).toHaveBeenCalledWith('uuid', false);
  expect(global.strapi.config.get).toHaveBeenCalledWith(
    'packageJsonStrapi.telemetryDisabled',
    null
  );
  expect(global.strapi.config.get).toHaveBeenCalledWith('admin.register.enabled', true);
  expect(global.strapi.service('admin::user').exists).toHaveBeenCalled();
  expect(result.data).toBeDefined();
  expect(result.data).toStrictEqual({
    uuid: 'foo',
    hasAdmin: true,
    menuLogo: null,
    authLogo: null,
    registerEnabled: 'foo',
  });
});
```

Note: the existing `beforeAll` mocks `strapi.config.get` to return the string `'foo'` for every key, so the test asserts the literal `'foo'` passes through. We are testing _that_ the controller reads the flag and returns it, not what the value means semantically.

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn workspace @strapi/admin jest src/controllers/__tests__/admin.test.ts -t "init"`
Expected: FAIL. The diff should show `registerEnabled` missing from `result.data`.

- [ ] **Step 3: Update the `init` controller**

Open `packages/core/admin/server/src/controllers/admin.ts` and replace the `init` method (lines 44–66) with:

```ts
async init() {
  let uuid = strapi.config.get('uuid', false);
  const hasAdmin = await getService('user').exists();
  const { menuLogo, authLogo } = await getService('project-settings').getProjectSettings();
  const registerEnabled = strapi.config.get('admin.register.enabled', true);
  // set to null if telemetryDisabled flag not avaialble in package.json
  const telemetryDisabled: boolean | null = strapi.config.get(
    'packageJsonStrapi.telemetryDisabled',
    null
  );

  if (telemetryDisabled !== null && telemetryDisabled === true) {
    uuid = false;
  }

  return {
    data: {
      uuid,
      hasAdmin,
      menuLogo: menuLogo ? menuLogo.url : null,
      authLogo: authLogo ? authLogo.url : null,
      registerEnabled,
    },
  } satisfies Init.Response;
},
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn workspace @strapi/admin jest src/controllers/__tests__/admin.test.ts -t "init"`
Expected: PASS.

- [ ] **Step 5: Run the full `admin.test.ts` suite to check for regressions**

Run: `yarn workspace @strapi/admin jest src/controllers/__tests__/admin.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/admin/server/src/controllers/admin.ts packages/core/admin/server/src/controllers/__tests__/admin.test.ts
git commit -m "feat(admin): return registerEnabled flag from /admin/init"
```

---

## Task 3: Guard `registerAdmin` with the new config flag

**Files:**

- Create: `packages/core/admin/server/src/controllers/__tests__/authentication.test.ts`
- Modify: `packages/core/admin/server/src/controllers/authentication.ts:177-242`

- [ ] **Step 1: Create the failing test file**

Create `packages/core/admin/server/src/controllers/__tests__/authentication.test.ts` with the following content:

```ts
import authenticationController from '../authentication';

describe('Authentication Controller', () => {
  describe('registerAdmin', () => {
    const mockCtx = () => ({
      request: { body: { email: 'a@b.c', password: 'Password1!', firstname: 'A' } },
      cookies: { set: jest.fn() },
      state: {},
      internalServerError: jest.fn(),
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('throws ApplicationError when admin.register.enabled is false', async () => {
      global.strapi = {
        config: {
          get: jest.fn((key: string, def: unknown) => {
            if (key === 'admin.register.enabled') return false;
            return def;
          }),
        },
        admin: {
          services: {
            user: {
              exists: jest.fn(() => false),
              create: jest.fn(),
              sanitizeUser: jest.fn((u) => u),
            },
            role: {
              getSuperAdmin: jest.fn(() => ({ id: 1 })),
            },
          },
        },
        log: { error: jest.fn() },
        telemetry: { send: jest.fn() },
        eventHub: { emit: jest.fn() },
      } as any;

      const ctx = mockCtx();

      await expect(authenticationController.registerAdmin(ctx as any)).rejects.toThrow(
        'Admin registration is disabled'
      );

      expect(global.strapi.config.get).toHaveBeenCalledWith('admin.register.enabled', true);
      expect(global.strapi.service('admin::user').exists).not.toHaveBeenCalled();
    });

    test('does not short-circuit when admin.register.enabled is true (default)', async () => {
      const hasAdmin = jest.fn(() => true);
      global.strapi = {
        config: {
          get: jest.fn((_key: string, def: unknown) => def),
        },
        admin: {
          services: {
            user: {
              exists: hasAdmin,
              create: jest.fn(),
              sanitizeUser: jest.fn((u) => u),
            },
            role: {
              getSuperAdmin: jest.fn(() => ({ id: 1 })),
            },
          },
        },
        log: { error: jest.fn() },
        telemetry: { send: jest.fn() },
        eventHub: { emit: jest.fn() },
      } as any;

      const ctx = mockCtx();

      // With hasAdmin === true, the existing second guard throws "You cannot register a new super admin".
      // We assert that error specifically — which proves the new guard passed through and the
      // existing guard ran (i.e. the new check did not break the happy path).
      await expect(authenticationController.registerAdmin(ctx as any)).rejects.toThrow(
        'You cannot register a new super admin'
      );
      expect(hasAdmin).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `yarn workspace @strapi/admin jest src/controllers/__tests__/authentication.test.ts`
Expected: FAIL. The first test fails because there is no "Admin registration is disabled" branch yet — either the validation runs and throws a ValidationError, or the existing `hasAdmin` guard runs.

- [ ] **Step 3: Add the guard in `registerAdmin`**

Open `packages/core/admin/server/src/controllers/authentication.ts`. Locate `registerAdmin` (starts at line 177). Insert the new guard as the first line of the method body:

```ts
async registerAdmin(ctx: Context) {
  const registerEnabled = strapi.config.get('admin.register.enabled', true);
  if (!registerEnabled) {
    throw new ApplicationError('Admin registration is disabled');
  }

  const input = ctx.request.body as Register.Request['body'];

  await validateAdminRegistrationInput(input);

  const hasAdmin = await getService('user').exists();

  if (hasAdmin) {
    throw new ApplicationError('You cannot register a new super admin');
  }

  // ...rest of the method unchanged
```

Do not change anything else in the method. The guard runs before `validateAdminRegistrationInput`, so a probe cannot tell whether payload validation would have passed.

- [ ] **Step 4: Run the new test file to verify it passes**

Run: `yarn workspace @strapi/admin jest src/controllers/__tests__/authentication.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Run the full admin server test suite to check for regressions**

Run: `yarn workspace @strapi/admin jest`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/admin/server/src/controllers/authentication.ts packages/core/admin/server/src/controllers/__tests__/authentication.test.ts
git commit -m "feat(admin): guard registerAdmin with admin.register.enabled flag"
```

---

## Task 4: Make the frontend `/admin/init` mock configurable

**Files:**

- Modify: `packages/core/admin/admin/tests/server.ts:207-213`

This is a test-infrastructure change. The current MSW handler returns an empty `data: {}`, which means no existing test can exercise `hasAdmin` or `registerEnabled` branches. We extend it to use a module-level overridable object so Task 5's tests can stub it.

- [ ] **Step 1: Replace the `/admin/init` MSW handler**

Open `packages/core/admin/admin/tests/server.ts` and locate the `/admin/init` handler (lines 207–213). Replace it with:

```ts
rest.get('/admin/init', (req, res, ctx) => {
  return res(
    ctx.json({
      data: {
        uuid: 'test-uuid',
        hasAdmin: initOverrides.hasAdmin,
        menuLogo: null,
        authLogo: null,
        registerEnabled: initOverrides.registerEnabled,
      },
    })
  );
}),
```

At the top of the same file, just below the existing imports, add a mutable overrides object and a reset helper:

```ts
export const initOverrides: {
  hasAdmin: boolean;
  registerEnabled: boolean;
} = {
  hasAdmin: true,
  registerEnabled: true,
};

export const resetInitOverrides = () => {
  initOverrides.hasAdmin = true;
  initOverrides.registerEnabled = true;
};
```

Defaults (`hasAdmin: true`, `registerEnabled: true`) match the most common "logged-out user on a configured instance" state that existing tests implicitly assume. Any test that cares about a different state sets `initOverrides.*` before rendering and calls `resetInitOverrides()` in `afterEach`.

- [ ] **Step 2: Run the full admin frontend test suite to check for regressions**

Run: `yarn workspace @strapi/admin test:front -- --run`
Expected: all existing tests PASS. The shape change to the `init` response is additive and backwards-compatible because existing consumers (the production code and any test that doesn't explicitly destructure the new fields) ignore extra keys.

Note: if any existing test starts failing because it was relying on `data: {}` being literally empty, update that test to `resetInitOverrides()` in `beforeEach` instead — do not revert this change.

- [ ] **Step 3: Commit**

```bash
git add packages/core/admin/admin/tests/server.ts
git commit -m "test(admin): make /admin/init MSW mock overridable for AuthPage tests"
```

---

## Task 5: Gate `AuthPage` redirects on `registerEnabled`

**Files:**

- Create: `packages/core/admin/admin/src/pages/Auth/tests/AuthPage.test.tsx`
- Modify: `packages/core/admin/admin/src/pages/Auth/AuthPage.tsx:14-85`

- [ ] **Step 1: Create the failing test file**

Create `packages/core/admin/admin/src/pages/Auth/tests/AuthPage.test.tsx` with the following content:

```tsx
import { render, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { initOverrides, resetInitOverrides } from '../../../../tests/server';
import { AuthPage } from '../AuthPage';

const renderAt = (pathname: string) =>
  render(
    <Routes>
      <Route path="/auth/:authType" element={<AuthPage />} />
      <Route path="/" element={<div>home</div>} />
    </Routes>,
    { initialEntries: [pathname] }
  );

describe('AuthPage routing', () => {
  afterEach(() => {
    resetInitOverrides();
  });

  describe('registerEnabled: true (default)', () => {
    test('redirects /auth/login to /auth/register-admin when no admin exists', async () => {
      initOverrides.hasAdmin = false;
      initOverrides.registerEnabled = true;

      renderAt('/auth/login');

      // The register-admin form renders a specific heading we can wait for.
      expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
      // We don't assert the URL directly here — redirect happened if the
      // register-admin component (not login) is on screen. Login would have
      // shown "Log in to your Strapi account"; register-admin shows
      // "Credentials" / first-admin copy.
      expect(screen.queryByText(/log in to your strapi account/i)).not.toBeInTheDocument();
    });
  });

  describe('registerEnabled: false', () => {
    test('does NOT redirect /auth/login to /auth/register-admin when no admin exists', async () => {
      initOverrides.hasAdmin = false;
      initOverrides.registerEnabled = false;

      renderAt('/auth/login');

      // Login form stays put.
      expect(await screen.findByText(/log in to your strapi account/i)).toBeInTheDocument();
    });

    test('redirects direct visit to /auth/register-admin to /auth/login (fresh install)', async () => {
      initOverrides.hasAdmin = false;
      initOverrides.registerEnabled = false;

      renderAt('/auth/register-admin');

      expect(await screen.findByText(/log in to your strapi account/i)).toBeInTheDocument();
    });

    test('redirects direct visit to /auth/register-admin to /auth/login (existing admin)', async () => {
      initOverrides.hasAdmin = true;
      initOverrides.registerEnabled = false;

      renderAt('/auth/register-admin');

      expect(await screen.findByText(/log in to your strapi account/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `yarn workspace @strapi/admin test:front -- --run src/pages/Auth/tests/AuthPage.test.tsx`
Expected: FAIL. The `registerEnabled: false` cases all fail because the current `AuthPage` ignores the flag and the auto-redirect in the `!hasAdmin` branch still fires.

- [ ] **Step 3: Update `AuthPage` to honor the flag**

Open `packages/core/admin/admin/src/pages/Auth/AuthPage.tsx`. Replace the body of the component (lines 14–85) with:

```tsx
const AuthPage = () => {
  const { search } = useLocation();
  const match = useMatch('/auth/:authType');
  const authType = match?.params.authType;
  const { data } = useInitQuery();
  const { hasAdmin, registerEnabled = true } = data ?? {};
  const Login = useEnterprise(
    LoginCE,
    async () => (await import('../../../../ee/admin/src/pages/AuthPage/components/Login')).LoginEE
  );
  const forms = useEnterprise<FormDictionary, Partial<FormDictionary>>(
    FORMS,
    async () => (await import('../../../../ee/admin/src/pages/AuthPage/constants')).FORMS,
    {
      combine(ceForms, eeForms) {
        return {
          ...ceForms,
          ...eeForms,
        };
      },
      defaultValue: FORMS,
    }
  );

  const { token } = useAuth('AuthPage', (auth) => auth);

  if (!authType || !forms) {
    return <Navigate to="/" />;
  }

  const Component = forms[authType as keyof FormDictionary];

  // Redirect the user to the login page if the endpoint does not exist
  if (!Component) {
    return <Navigate to="/" />;
  }

  // If register-admin is the requested page but self-registration is disabled,
  // send the user to /auth/login regardless of whether an admin exists.
  if (authType === 'register-admin' && !registerEnabled) {
    return <Navigate to="/auth/login" />;
  }

  // User is already logged in
  if (authType !== 'register-admin' && authType !== 'register' && token) {
    return <Navigate to="/" />;
  }

  // there is already an admin user oo
  if (hasAdmin && authType === 'register-admin' && token) {
    return <Navigate to="/" />;
  }

  // Redirect the user to the register-admin if it is the first user
  // AND self-registration is enabled. Otherwise leave them on whichever
  // auth page they requested (typically /auth/login).
  if (!hasAdmin && authType !== 'register-admin' && registerEnabled) {
    return (
      <Navigate
        to={{
          pathname: '/auth/register-admin',
          // Forward the `?redirectTo` from /auth/login
          // /abc => /auth/login?redirectTo=%2Fabc => /auth/register-admin?redirectTo=%2Fabc
          search,
        }}
      />
    );
  }

  if (Login && authType === 'login') {
    // Assign the component to render for the login form
    return <Login />;
  } else if (authType === 'login' && !Login) {
    // block rendering until the Login EE component is fully loaded
    return null;
  }

  return <Component hasAdmin={hasAdmin} />;
};
```

Two behavioral changes only:

1. New early-return at the "disabled + register-admin" condition.
2. The `!hasAdmin` auto-redirect now includes `&& registerEnabled` in its predicate.

Everything else (token check, existing `hasAdmin && register-admin && token` redirect, Login component selection) is preserved verbatim.

- [ ] **Step 4: Run the new test file to verify it passes**

Run: `yarn workspace @strapi/admin test:front -- --run src/pages/Auth/tests/AuthPage.test.tsx`
Expected: all four tests PASS.

- [ ] **Step 5: Run the full admin frontend test suite to check for regressions**

Run: `yarn workspace @strapi/admin test:front -- --run`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/admin/admin/src/pages/Auth/AuthPage.tsx packages/core/admin/admin/src/pages/Auth/tests/AuthPage.test.tsx
git commit -m "feat(admin): gate AuthPage redirects on registerEnabled flag"
```

---

## Task 6: Whole-stack smoke verification

This task has no code changes — it's a verification gate before handing off to review.

- [ ] **Step 1: Type-check the admin workspace**

Run: `yarn workspace @strapi/admin run typecheck`
Expected: PASS (no type errors in contracts, controllers, or AuthPage).

- [ ] **Step 2: Lint the touched files**

Run:

```bash
yarn workspace @strapi/admin run lint \
  packages/core/admin/shared/contracts/admin.ts \
  packages/core/admin/server/src/controllers/admin.ts \
  packages/core/admin/server/src/controllers/authentication.ts \
  packages/core/admin/server/src/controllers/__tests__/admin.test.ts \
  packages/core/admin/server/src/controllers/__tests__/authentication.test.ts \
  packages/core/admin/admin/src/pages/Auth/AuthPage.tsx \
  packages/core/admin/admin/src/pages/Auth/tests/AuthPage.test.tsx \
  packages/core/admin/admin/tests/server.ts
```

Expected: PASS or, if the workspace doesn't accept path arguments, run the workspace-wide lint: `yarn workspace @strapi/admin run lint`. Expected: PASS.

- [ ] **Step 3: Run all admin server tests**

Run: `yarn workspace @strapi/admin jest`
Expected: all tests PASS.

- [ ] **Step 4: Run all admin frontend tests**

Run: `yarn workspace @strapi/admin test:front -- --run`
Expected: all tests PASS.

- [ ] **Step 5: Manual sanity check (optional but recommended)**

If a local Strapi instance is easy to bring up:

1. Start a fresh app with `admin.register.enabled: false` in `config/admin.ts`, no pre-existing admin.
2. Open `/admin`. Expected: lands on `/auth/login`, no auto-redirect to `/auth/register-admin`.
3. POST `http://localhost:1337/admin/register-admin` with a valid-looking payload. Expected: 400 with body `{ "error": { "message": "Admin registration is disabled", ... } }`.
4. Stop Strapi, remove the flag (or set it to `true`), restart. Expected: usual `/auth/register-admin` auto-redirect returns.

Skip Step 5 if bringing up a local stack is disproportionate to the review effort.

---

## Self-Review Notes

- **Spec coverage:** Every backend and frontend change listed in the spec maps to a task (1–5). Task 6 is the verification gate.
- **Types:** `registerEnabled: boolean` used consistently across contract (Task 1), controller (Task 2), MSW mock (Task 4), and `AuthPage` destructure (Task 5). Default value `true` used consistently in `strapi.config.get('admin.register.enabled', true)` at every call site and in the destructure.
- **TDD order:** Every code task writes the failing test first (Task 2 updates an existing test; Tasks 3 and 5 create new test files before touching production code).
- **Commit cadence:** Six small commits, one per task, each independently reviewable.
- **Open question (deferred):** Final config key name — tracked in the variants doc and flagged in the spec. Not blocking implementation.
