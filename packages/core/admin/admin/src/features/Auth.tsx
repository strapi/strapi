import * as React from 'react';

import { auth } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';

import { Login } from '../../../shared/contracts/authentication';
import { createContext } from '../components/Context';
import { useTypedDispatch } from '../core/store/hooks';
import { setLocale } from '../reducer';
import {
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useRenewTokenMutation,
} from '../services/auth';

import type { SanitizedAdminUser } from '../../../shared/contracts/shared';

interface AuthContextValue {
  login: (
    body: Login.Request['body'] & { rememberMe: boolean }
  ) => Promise<Awaited<ReturnType<ReturnType<typeof useLoginMutation>[0]>>>;
  logout: () => Promise<void>;
  setToken: (token: string | null) => void;
  token: string | null;
  user?: SanitizedAdminUser;
}

const [Provider, useAuth] = createContext<AuthContextValue>('Auth');

interface AuthProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useTypedDispatch();
  const [token, setToken] = React.useState<string | null>(() => {
    const token =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN);

    if (typeof token === 'string') {
      return JSON.parse(token);
    }

    return null;
  });

  const { data: user } = useGetMeQuery(undefined, {
    /**
     * If there's no token, we don't try to fetch
     * the user data because it will fail.
     */
    skip: !token,
  });
  const { push } = useHistory();

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
          push('/auth/login');
        }
      });
    }
  }, [renewTokenMutation, clearStorage, push]);

  /**
   * Backwards compat – store the user info in the session storage
   *
   * TODO: V5 remove this and only explicitly set it when required.
   */
  React.useEffect(() => {
    auth.setUserInfo(user, true);
    if (user) {
      if (user.preferedLanguage) {
        dispatch(setLocale(user.preferedLanguage));
      }
    }
  }, [dispatch, user]);

  /**
   * Backwards compat – store the token in the session storage
   *
   * TODO: V5 remove this and only explicitly set it when required.
   */
  React.useEffect(() => {
    auth.setToken(token, false);
  }, [token]);

  React.useEffect(() => {
    /**
     * This will log a user out of all tabs if they log out in one tab.
     */
    const handleUserStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.USER && event.newValue === null) {
        clearStorage();
        push('/auth/login');
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

        auth.setToken(token, rememberMe);
        setToken(token);
      }

      return res;
    },
    [loginMutation]
  );

  const logout = React.useCallback(async () => {
    await logoutMutation();
    clearStorage();
    push('/auth/login');
  }, [clearStorage, logoutMutation, push]);

  return (
    <Provider token={token} user={user} login={login} logout={logout} setToken={setToken}>
      {children}
    </Provider>
  );
};

export { AuthProvider, useAuth };
