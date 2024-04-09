import * as React from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { Login } from '../../../shared/contracts/authentication';
import { createContext } from '../components/Context';
import { useTypedDispatch } from '../core/store/hooks';
import { useStrapiApp } from '../features/StrapiApp';
import { setLocale } from '../reducer';
import {
  useGetMeQuery,
  useGetMyPermissionsQuery,
  useLazyCheckPermissionsQuery,
  useLoginMutation,
  useLogoutMutation,
  useRenewTokenMutation,
} from '../services/auth';

import type {
  Permission as PermissionContract,
  SanitizedAdminUser,
} from '../../../shared/contracts/shared';

interface Permission
  extends Pick<PermissionContract, 'action' | 'subject'>,
    Partial<Omit<PermissionContract, 'action' | 'subject'>> {}

interface User
  extends Pick<SanitizedAdminUser, 'email' | 'firstname' | 'lastname' | 'username' | 'roles'>,
    Partial<Omit<SanitizedAdminUser, 'email' | 'firstname' | 'lastname' | 'username' | 'roles'>> {}

interface AuthContextValue {
  login: (
    body: Login.Request['body'] & { rememberMe: boolean }
  ) => Promise<Awaited<ReturnType<ReturnType<typeof useLoginMutation>[0]>>>;
  logout: () => Promise<void>;
  /**
   * @alpha
   * @description given a list of permissions, this function checks
   * those against the current user's permissions or those passed as
   * the second argument, if the user has those permissions the complete
   * permission object form the API is returned. Therefore, if the list is
   * empty, the user does not have any of those permissions.
   */
  checkUserHasPermissions: (
    permissions?: Permission[],
    passedPermissions?: Permission[]
  ) => Promise<Permission[]>;
  isLoading: boolean;
  permissions: Permission[];
  refetchPermissions: () => Promise<void>;
  setToken: (token: string | null) => void;
  token: string | null;
  user?: User;
}

const [Provider, useAuth] = createContext<AuthContextValue>('Auth');

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * @internal could be removed at any time.
   */
  _defaultPermissions?: Permission[];
}

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

const AuthProvider = ({ children, _defaultPermissions = [] }: AuthProviderProps) => {
  const dispatch = useTypedDispatch();
  const runRbacMiddleware = useStrapiApp('AuthProvider', (state) => state.rbac.run);
  const location = useLocation();
  const [token, setToken] = React.useState<string | null>(() => {
    const token =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN);

    if (typeof token === 'string') {
      return JSON.parse(token);
    }

    return null;
  });

  const { data: user, isLoading: isLoadingUser } = useGetMeQuery(undefined, {
    /**
     * If there's no token, we don't try to fetch
     * the user data because it will fail.
     */
    skip: !token,
  });
  const {
    data: userPermissions = _defaultPermissions,
    refetch,
    isUninitialized,
    isLoading: isLoadingPermissions,
  } = useGetMyPermissionsQuery(undefined, {
    skip: !token,
  });

  const navigate = useNavigate();

  const [loginMutation] = useLoginMutation();
  const [renewTokenMutation] = useRenewTokenMutation();
  const [logoutMutation] = useLogoutMutation();

  const clearStorage = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    setToken(null);
  }, []);

  /**
   * Fetch data from storages on mount and store it in our state.
   * It's not normally stored in session storage unless the user
   * does click "remember me" when they login. We also need to renew the token.
   */
  React.useEffect(() => {
    const token =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN);

    if (token) {
      renewTokenMutation({ token: JSON.parse(token) }).then((res) => {
        if ('data' in res) {
          setToken(res.data.token);
        } else {
          clearStorage();
          navigate('/auth/login');
        }
      });
    }
  }, [renewTokenMutation, clearStorage, navigate]);

  React.useEffect(() => {
    if (user) {
      if (user.preferedLanguage) {
        dispatch(setLocale(user.preferedLanguage));
      }
    }
  }, [dispatch, user]);

  React.useEffect(() => {
    if (token) {
      storeToken(token, false);
    }
  }, [token]);

  React.useEffect(() => {
    /**
     * This will log a user out of all tabs if they log out in one tab.
     */
    const handleUserStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.USER && event.newValue === null) {
        clearStorage();
        navigate('/auth/login');
      }
    };

    window.addEventListener('storage', handleUserStorageChange);

    return () => {
      window.removeEventListener('storage', handleUserStorageChange);
    };
  });

  const login = React.useCallback<AuthContextValue['login']>(
    async ({ rememberMe, ...body }) => {
      const res = await loginMutation(body);

      /**
       * There will always be a `data` key in the response
       * because if something fails, it will throw an error.
       */
      if ('data' in res) {
        const { token } = res.data;

        storeToken(token, rememberMe);
        setToken(token);
      }

      return res;
    },
    [loginMutation]
  );

  const logout = React.useCallback(async () => {
    await logoutMutation();
    clearStorage();
    navigate('/auth/login');
  }, [clearStorage, logoutMutation, navigate]);

  const refetchPermissions = React.useCallback(async () => {
    if (!isUninitialized) {
      await refetch();
    }
  }, [isUninitialized, refetch]);

  const [checkPermissions] = useLazyCheckPermissionsQuery();
  const checkUserHasPermissions: AuthContextValue['checkUserHasPermissions'] = React.useCallback(
    async (permissions, passedPermissions) => {
      /**
       * If there's no permissions to check, then we allow it to
       * pass to preserve existing behaviours.
       *
       * TODO: should we review this? it feels more dangerous than useful.
       */
      if (!permissions || permissions.length === 0) {
        return [{ action: '', subject: '' }];
      }

      /**
       * Given the provided permissions, return the permissions from either passedPermissions
       * or userPermissions as this is expected to be the full permission entity.
       */
      const actualUserPermissions = passedPermissions ?? userPermissions;

      const matchingPermissions = actualUserPermissions.filter(
        (permission) =>
          permissions.findIndex(
            (perm) => perm.action === permission.action && perm.subject === permission.subject
          ) >= 0
      );

      const middlewaredPermissions = await runRbacMiddleware(
        {
          user,
          permissions: userPermissions,
          pathname: location.pathname,
          search: location.search.split('?')[1] ?? '',
        },
        matchingPermissions
      );

      const shouldCheckConditions = middlewaredPermissions.some(
        (perm) => Array.isArray(perm.conditions) && perm.conditions.length > 0
      );

      if (!shouldCheckConditions) {
        return middlewaredPermissions;
      }

      const { data, error } = await checkPermissions({
        permissions: middlewaredPermissions.map((perm) => ({
          action: perm.action,
          subject: perm.subject,
        })),
      });

      if (error) {
        throw error;
      } else {
        return middlewaredPermissions.filter((_, index) => data?.data[index] === true);
      }
    },
    [checkPermissions, location.pathname, location.search, runRbacMiddleware, user, userPermissions]
  );

  const isLoading = isLoadingUser || isLoadingPermissions;

  return (
    <Provider
      token={token}
      user={user}
      login={login}
      logout={logout}
      permissions={userPermissions}
      checkUserHasPermissions={checkUserHasPermissions}
      refetchPermissions={refetchPermissions}
      setToken={setToken}
      isLoading={isLoading}
    >
      {children}
    </Provider>
  );
};

const storeToken = (token: string, persist?: boolean) => {
  if (!persist) {
    return window.sessionStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token));
  }
  return window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token));
};

export { AuthProvider, useAuth, STORAGE_KEYS };
export type { AuthContextValue, Permission, User };
