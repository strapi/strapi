import * as React from 'react';

import { Dialog } from '@strapi/design-system';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';

import { Login } from '../../../shared/contracts/authentication';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { createContext } from '../components/Context';
import { useTypedDispatch, useTypedSelector } from '../core/store/hooks';
import { useStrapiApp } from '../features/StrapiApp';
import { useQueryParams } from '../hooks/useQueryParams';
import { useSessionKeepalive } from '../hooks/useSessionKeepalive';
import {
  getStoredToken,
  login as loginAction,
  logout as logoutAction,
  setLocale,
  setToken,
} from '../reducer';
import { adminApi } from '../services/api';
import {
  useGetMeQuery,
  useGetMyPermissionsQuery,
  useLazyCheckPermissionsQuery,
  useLoginMutation,
  useLogoutMutation,
} from '../services/auth';
import { normalizeAdminLocale } from '../translations/normalizeAdminLocale';
import { getOrCreateDeviceId } from '../utils/deviceId';
import {
  attemptTokenRefresh,
  getFetchClient,
  resetSessionExpiredNotification,
  setOnSessionExpired,
  setOnTokenUpdate,
} from '../utils/getFetchClient';
import { hasUnsavedChanges } from '../utils/unsavedChangesRegistry';

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

/**
 * ensure the Auth context never exposes a non-function for checkUserHasPermissions.
 * When this is undefined (e.g. context timing in production builds), consumers would throw
 * "p is not a function" / "checkUserHasPermissions is not a function". By always passing
 * a function here, all current and future consumers are protected without per-call-site guards.
 *
 * When would the fallback run? Only if the real checkUserHasPermissions were ever undefined
 * when we pass to the Provider (e.g. a rare timing/build edge case). In normal runs it is
 * always defined (useCallback), so the real function is passed and behavior is unchanged.
 *
 * If the fallback ever did run: it returns [] so consumers (which use .length > 0) treat it
 * as "no permission" for that render—under-permissive. On the next AuthProvider re-render we
 * pass the real function again, so the context updates and the view corrects quickly.
 * @see https://github.com/strapi/strapi/issues/24384
 */
const NOOP_CHECK_USER_HAS_PERMISSIONS: AuthContextValue['checkUserHasPermissions'] = async () => [];

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

/**
 * Why the session is ending.
 * - `voluntary`: explicit user logout — cancelable when there are unsaved edits.
 * - `session-dead`: server rejected the refresh (idle/max session window elapsed)
 *   — forced; Cancel / dismiss still clears client state.
 *
 * Short-lived access-token expiry is NOT a logout reason: idle tabs leave the
 * stale token in place and the next request refreshes (or hits session-dead).
 */
type LogoutReason = 'voluntary' | 'session-dead';

const isForcedLogout = (reason: LogoutReason) => reason === 'session-dead';

/**
 * Copy for the unsaved-changes prompt. A server-confirmed dead session needs to
 * say *why* the dialog appeared, otherwise it reads as the usual navigation
 * blocker and users confirm straight through it.
 */
const LOGOUT_PROMPTS = {
  voluntary: {
    title: undefined,
    body: {
      id: 'global.prompt.unsaved',
      defaultMessage: 'You have unsaved changes, are you sure you want to leave?',
    },
  },
  'session-dead': {
    title: {
      id: 'app.session.ended.title',
      defaultMessage: 'Session ended',
    },
    body: {
      id: 'app.session.ended.unsaved',
      defaultMessage:
        "Your session has ended and can't be resumed. Your unsaved changes will be lost when you log out.",
    },
  },
} satisfies Record<LogoutReason, { title?: MessageDescriptor; body: MessageDescriptor }>;

const AuthProvider = ({
  children,
  _defaultPermissions = [],
  _disableRenewToken = false,
}: AuthProviderProps) => {
  const { formatMessage } = useIntl();
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

  const pendingLogoutRef = React.useRef<(() => void) | null>(null);
  const logoutGuardOpenRef = React.useRef(false);
  const logoutGuardReasonRef = React.useRef<LogoutReason>('voluntary');
  const [isSessionLogoutDialogOpen, setIsSessionLogoutDialogOpen] = React.useState(false);
  const [sessionLogoutReason, setSessionLogoutReason] = React.useState<LogoutReason>('voluntary');

  /**
   * Prompt before discarding unsaved edits, then run `logoutFn`.
   *
   * - `voluntary`: Cancel leaves the user logged in (server session intact).
   * - `session-dead`: the session is already unusable — Cancel (or dismiss)
   *   still runs `logoutFn` so the client cannot keep a stale token. While the
   *   dialog is open, a later `session-dead` request upgrades the pending action.
   */
  const runLogoutWithGuard = React.useCallback(
    (logoutFn: () => void, reason: LogoutReason = 'voluntary') => {
      if (logoutGuardOpenRef.current) {
        pendingLogoutRef.current = logoutFn;
        if (isForcedLogout(reason)) {
          logoutGuardReasonRef.current = reason;
          setSessionLogoutReason(reason);
        }
        return;
      }

      if (!hasUnsavedChanges()) {
        logoutFn();
        return;
      }

      logoutGuardOpenRef.current = true;
      logoutGuardReasonRef.current = reason;
      pendingLogoutRef.current = logoutFn;
      setSessionLogoutReason(reason);
      setIsSessionLogoutDialogOpen(true);
    },
    []
  );

  const performGlobalLogout = React.useCallback(() => {
    void (async () => {
      try {
        const { post } = getFetchClient();
        await post('/admin/logout');
      } catch {
        // The session may already be invalid.
      }
    })();

    dispatch(adminApi.util.resetApiState());
    dispatch(logoutAction());
    navigate('/auth/login');
  }, [dispatch, navigate]);

  const clearStateAndLogout = React.useCallback(() => {
    runLogoutWithGuard(performGlobalLogout, 'session-dead');
  }, [performGlobalLogout, runLogoutWithGuard]);

  const handleConfirmSessionLogout = React.useCallback(() => {
    logoutGuardOpenRef.current = false;
    logoutGuardReasonRef.current = 'voluntary';
    setIsSessionLogoutDialogOpen(false);
    setSessionLogoutReason('voluntary');
    const logoutFn = pendingLogoutRef.current;
    pendingLogoutRef.current = null;
    logoutFn?.();
  }, []);

  const handleCancelSessionLogout = React.useCallback(() => {
    const forced = isForcedLogout(logoutGuardReasonRef.current);
    const logoutFn = pendingLogoutRef.current;
    logoutGuardOpenRef.current = false;
    logoutGuardReasonRef.current = 'voluntary';
    pendingLogoutRef.current = null;
    setIsSessionLogoutDialogOpen(false);
    setSessionLogoutReason('voluntary');
    // Forced paths: session is already dead — dismiss must still clear client state.
    if (forced) {
      logoutFn?.();
    }
  }, []);

  const handleSessionLogoutDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        handleCancelSessionLogout();
      }
    },
    [handleCancelSessionLogout]
  );

  const resyncToken = React.useCallback(
    (newToken: string) => {
      dispatch(setToken(newToken));
    },
    [dispatch]
  );

  /**
   * Track the timestamp of the user's last interaction. This is the activity
   * signal `useSessionKeepalive` uses to tell an active user (silently renew
   * their session) apart from a genuinely idle one (leave the stale access
   * token alone until the next request). Successful API calls don't refresh
   * the short-lived access token on their own, so without this an
   * actively-working user would hit a 401 the moment the token expires.
   */
  const lastActivityRef = React.useRef(Date.now());
  React.useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) =>
      window.addEventListener(event, markActivity, { passive: true, capture: true })
    );

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActivity, { capture: true }));
    };
  }, []);
  const getLastActivityAt = React.useCallback(() => lastActivityRef.current, []);

  /**
   * Silently rotate the refresh token and mint a new access token. Returns
   * `true` on success (the resulting `setToken` re-arms the renew timer) and
   * `false` when the server rejects it (session genuinely over).
   */
  const renewSession = React.useCallback(async () => {
    try {
      await attemptTokenRefresh();
      return true;
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    if (user) {
      if (user.preferedLanguage) {
        dispatch(setLocale(normalizeAdminLocale(user.preferedLanguage)));
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

  /**
   * Register the session-expired handler that the fetch layer / RTK baseQuery
   * call when the server rejects the refresh token. This is what redirects
   * the active tab to /auth/login on a 401, instead of leaving the user on
   * a stale page until they click something.
   */
  React.useEffect(() => {
    setOnSessionExpired(() => {
      clearStateAndLogout();
    });

    return () => {
      setOnSessionExpired(null);
    };
  }, [clearStateAndLogout]);

  /**
   * Session keepalive around access-token expiry. The timer fires per-tab; the
   * hook then either (1) re-syncs from a token another tab refreshed, (2)
   * silently renews when the user has been active, or (3) does nothing when
   * idle — leaving the stale access token in place so unsaved form state
   * survives until the next request refreshes it. A server-confirmed dead
   * session (renewal rejected) broadcasts globally via `onSessionDead`. See
   * `useSessionKeepalive` for the full rationale.
   */
  useSessionKeepalive({
    token,
    onSessionDead: clearStateAndLogout,
    getStoredToken,
    onResync: resyncToken,
    getLastActivityAt,
    renewSession,
    disabled: _disableRenewToken,
  });

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

        resetSessionExpiredNotification();
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

  /**
   * Explicit user logout. Confirm unsaved changes *before* `logoutMutation` so
   * Cancel leaves the server session and client token intact.
   */
  const logout = React.useCallback(async () => {
    runLogoutWithGuard(() => {
      void (async () => {
        try {
          await logoutMutation({ deviceId: getOrCreateDeviceId() });
        } catch {
          // The session may already be invalid.
        }
        performGlobalLogout();
      })();
    });
  }, [logoutMutation, performGlobalLogout, runLogoutWithGuard]);

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
    <>
      <Provider
        token={token}
        user={user}
        login={login}
        logout={logout}
        permissions={userPermissions}
        checkUserHasPermissions={checkUserHasPermissions ?? NOOP_CHECK_USER_HAS_PERMISSIONS}
        refetchPermissions={refetchPermissions}
        isLoading={isLoading}
      >
        {children}
      </Provider>
      <Dialog.Root
        open={isSessionLogoutDialogOpen}
        onOpenChange={handleSessionLogoutDialogOpenChange}
      >
        <ConfirmDialog
          onConfirm={handleConfirmSessionLogout}
          onCancel={handleCancelSessionLogout}
          title={
            LOGOUT_PROMPTS[sessionLogoutReason].title
              ? formatMessage(LOGOUT_PROMPTS[sessionLogoutReason].title)
              : undefined
          }
          // Forced session-dead: no Cancel that pretends the session is still valid.
          startAction={isForcedLogout(sessionLogoutReason) ? <></> : undefined}
        >
          {formatMessage(LOGOUT_PROMPTS[sessionLogoutReason].body)}
        </ConfirmDialog>
      </Dialog.Root>
    </>
  );
};

export { AuthProvider, useAuth, STORAGE_KEYS };
export type { AuthContextValue, Permission, User };
