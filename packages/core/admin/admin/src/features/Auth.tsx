import * as React from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { Login } from '../../../shared/contracts/authentication';
import { createContext } from '../components/Context';
import { useTypedDispatch, useTypedSelector } from '../core/store/hooks';
import { useStrapiApp } from '../features/StrapiApp';
import { useQueryParams } from '../hooks/useQueryParams';
import { login as loginAction, logout as logoutAction, setLocale, setToken } from '../reducer';
import { adminApi } from '../services/api';
import {
  useGetMeQuery,
  useGetMyPermissionsQuery,
  useLazyCheckPermissionsQuery,
  useLoginMutation,
  useLogoutMutation,
} from '../services/auth';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { setOnTokenUpdate } from '../utils/getFetchClient';

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
    permissions?: Array<Pick<Permission, 'action'> & Partial<Omit<Permission, 'action'>>>,
    passedPermissions?: Permission[],
    rawQueryContext?: string
  ) => Promise<Permission[]>;
  isLoading: boolean;
  permissions: Permission[];
  refetchPermissions: () => Promise<void>;
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

  // NOTE: this is used for testing purposed only
  _disableRenewToken?: boolean;
}

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  STATUS: 'isLoggedIn',
};

const AuthProvider = ({
  children,
  _defaultPermissions = [],
  _disableRenewToken = false,
}: AuthProviderProps) => {
  const dispatch = useTypedDispatch();
  const runRbacMiddleware = useStrapiApp('AuthProvider', (state) => state.rbac.run);
  const location = useLocation();
  const [{ rawQuery }] = useQueryParams();

  const locationRef = React.useRef(location);

  // Update ref without causing re-render
  React.useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const token = useTypedSelector((state) => state.admin_app.token ?? null);

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
  const [logoutMutation] = useLogoutMutation();

  const clearStateAndLogout = React.useCallback(() => {
    dispatch(adminApi.util.resetApiState());
    dispatch(logoutAction());
    navigate('/auth/login');
  }, [dispatch, navigate]);

  React.useEffect(() => {
    if (user) {
      if (user.preferedLanguage) {
        dispatch(setLocale(user.preferedLanguage));
      }
    }
  }, [dispatch, user]);

  /**
   * Register a callback to update Redux state when the token is refreshed.
   * This ensures the app state stays in sync with the token stored in localStorage/cookies.
   */
  React.useEffect(() => {
    setOnTokenUpdate((newToken) => {
      dispatch(setToken(newToken));
    });

    return () => {
      setOnTokenUpdate(null);
    };
  }, [dispatch]);

  React.useEffect(() => {
    /**
     * This will log a user out of all tabs if they log out in one tab.
     */
    const handleUserStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.STATUS && event.newValue === null) {
        clearStateAndLogout();
      }
    };

    window.addEventListener('storage', handleUserStorageChange);

    return () => {
      window.removeEventListener('storage', handleUserStorageChange);
    };
  });

  const login = React.useCallback<AuthContextValue['login']>(
    async ({ rememberMe, ...body }) => {
      const res = await loginMutation({ ...body, deviceId: getOrCreateDeviceId(), rememberMe });

      /**
       * There will always be a `data` key in the response
       * because if something fails, it will throw an error.
       */
      if ('data' in res) {
        const { token } = res.data;

        dispatch(
          loginAction({
            token,
            persist: rememberMe,
          })
        );
      }

      return res;
    },
    [dispatch, loginMutation]
  );

  const logout = React.useCallback(async () => {
    await logoutMutation({ deviceId: getOrCreateDeviceId() });
    clearStateAndLogout();
  }, [clearStateAndLogout, logoutMutation]);

  const refetchPermissions = React.useCallback(async () => {
    if (!isUninitialized) {
      await refetch();
    }
  }, [isUninitialized, refetch]);

  const [checkPermissions] = useLazyCheckPermissionsQuery();
  const checkUserHasPermissions: AuthContextValue['checkUserHasPermissions'] = React.useCallback(
    async (
      permissions,
      passedPermissions,
      // TODO:
      // Here we have parameterised checkUserHasPermissions in order to pass
      // query context from elsewhere in the application.
      // See packages/core/content-manager/admin/src/features/DocumentRBAC.tsx

      // This is in order to calculate permissions on accurate query params.
      // We should be able to rely on the query params in this provider
      // If we need to pass additional context to the RBAC middleware
      // we should define a better context type.
      rawQueryContext
    ) => {
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
            (perm) =>
              perm.action === permission.action &&
              // Only check the subject if it's provided
              (perm.subject == undefined || perm.subject === permission.subject)
          ) >= 0
      );

      const middlewaredPermissions = await runRbacMiddleware(
        {
          user,
          permissions: userPermissions,
          pathname: locationRef.current.pathname,
          search: (rawQueryContext || rawQuery).split('?')[1] ?? '',
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
    [checkPermissions, rawQuery, runRbacMiddleware, user, userPermissions]
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
      isLoading={isLoading}
    >
      {children}
    </Provider>
  );
};

export { AuthProvider, useAuth, STORAGE_KEYS };
export type { AuthContextValue, Permission, User };
