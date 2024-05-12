---
title: Authentication
tags:
  - admin
  - auth
---

Authentication was previously non-reactive using `localStorage` or `sessionStorage` to store the information and the user. It was accessed by the now deprecated `auth` object imported from the `helper-plugin`. This didn't work well because we couldn't use it to correctly stop & fire requests that required users to be authenticated e.g. gettng project configurations.

However, we now store the token in state along with the user & this can be passed around the application via the `useAuth` hook. For backwards compatability in `v4` we still use the `auth` object but this will likely be removed in a later version of strapi.

## Usage

The `useAuth` hook is built on top of a custom `createContext` version which asserts the context is there and throws an error if this is not the case.
Therefore the hook expects a "consumer name" to be passed so a helpful error message can be provided. It is also built using the `use-context-selector` library meaning we can also pass a selector function to the hook to select a specific part of the context.

```ts
const token = useAuth('App', (state) => state.token); // token will be a string or null
```

## API

```ts
interface SanitizedAdminUser {
  blocked: boolean;
  email?: string;
  firstname?: string;
  isActive: boolean;
  lastname?: string;
  preferedLanguage?: string;
  registrationToken?: string | null;
  roles: Array<{ name: string; code: string; description?: string }>;
  username?: string;
}

interface AuthContext {
  login: (body: { email: string; password: string; rememberMe: boolean }) =>
    | {
        data: {
          token: string;
          user: Omit<SanitizedAdminUser, 'permissions'>;
        };
      }
    | {
        error: BaseQueryError | SerializedError;
      };
  logout: () => Promise<void>;
  setToken: (token: string | null) => void;
  token: string | null;
  user?: SanitizedAdminUser;
}

type UseAuth = <Selected>(
  consumerName: string,
  selector: (state: AuthContext) => Selected
) => Selected;
```
