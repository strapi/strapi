import { useCallback, useMemo, useState, useRef, useEffect } from 'react';

import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios'; // TODO: To remove when we change the position of the useRBAC hook
import qs from 'qs'; // TODO: To remove when we change the position of the useRBAC hook
import { useQueries } from 'react-query';

import { useRBACProvider, Permission } from '../features/RBAC';
import { auth } from '../utils/auth'; // TODO: To remove when we change the position of the useRBAC hook

export type AllowedActions = Record<string, boolean>;

/**
 * useFetchClient implementation code.
 * TODO: To remove when we change the position of the useRBAC hook and use instead the useFetchClient function from the admin.
 */

const fetchClient = (): AxiosInstance => {
  const instance = axios.create({
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { encode: false });
    },
  });

  // Add a request interceptor to add authorization token to headers, rejects errors
  instance.interceptors.request.use(
    async (config) => {
      config.headers.Authorization = `Bearer ${auth.getToken()}`;

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add a response interceptor to return the response or handle the error
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        auth.clearAppStorage();
        window.location.reload();
      }

      throw error;
    }
  );

  return instance;
};

const instance = fetchClient();

const addPrependingSlash = (url: string) => (url.charAt(0) !== '/' ? `/${url}` : url);

// This regular expression matches a string that starts with either "http://" or "https://" or any other protocol name in lower case letters, followed by "://" and ends with anything else
const hasProtocol = (url: string) => new RegExp('^(?:[a-z+]+:)?//', 'i').test(url);

// Check if the url has a prepending slash, if not add a slash
const normalizeUrl = (url: string) => (hasProtocol(url) ? url : addPrependingSlash(url));

type FetchClient = {
  get: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
  put: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    data?: TSend,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
  post: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    data?: TSend,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
  del: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
};

const getFetchClient = (defaultOptions: AxiosRequestConfig = {}): FetchClient => {
  instance.defaults.baseURL = window.strapi.backendURL;
  return {
    get: (url, config) =>
      instance.get(normalizeUrl(url), {
        ...defaultOptions,
        ...config,
      }),
    put: (url, data, config) =>
      instance.put(normalizeUrl(url), data, { ...defaultOptions, ...config }),
    post: (url, data, config) =>
      instance.post(normalizeUrl(url), data, { ...defaultOptions, ...config }),
    del: (url, config) => instance.delete(normalizeUrl(url), { ...defaultOptions, ...config }),
  };
};

const useFetchClient = () => {
  const controller = useRef<AbortController | null>(null);

  if (controller.current === null) {
    controller.current = new AbortController();
  }

  useEffect(() => {
    return () => {
      controller.current!.abort();
    };
  }, []);

  return useMemo(
    () =>
      getFetchClient({
        signal: controller.current!.signal,
      }),
    []
  );
};

export { useFetchClient };

// useFetchClient end code.

export const useRBAC = (
  permissionsToCheck: Record<string, Permission[]> = {},
  passedPermissions?: Permission[]
): { allowedActions: AllowedActions; isLoading: boolean; setIsLoading: () => void } => {
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  /**
   * This is the default value we return until the queryResults[i].data
   * are all resolved with data. This preserves the original behaviour.
   */
  const defaultAllowedActions = useMemo(
    () =>
      Object.keys(permissionsToCheck).map((name) => ({
        name,
        hasPermission: false,
      })),
    [permissionsToCheck]
  );

  const { allPermissions } = useRBACProvider();
  const { post } = useFetchClient();

  const userPermissions = passedPermissions || allPermissions;

  const permissionsToCheckEntries = Object.entries(permissionsToCheck);

  const queryResults = useQueries(
    permissionsToCheckEntries.map(([name, permissions]) => ({
      queryKey: ['useRBAC', name, ...permissions, userPermissions],
      async queryFn() {
        if (!permissions || !permissions.length) {
          return { name, hasPermission: true };
        }

        if (!userPermissions) return;

        const matchingPermissions = userPermissions.filter((value) => {
          const associatedPermission = permissions.find(
            (perm) => perm.action === value.action && perm.subject === value.subject
          );

          return associatedPermission !== undefined;
        });

        if (
          matchingPermissions.length > 0 &&
          matchingPermissions.every(
            (permission) => Array.isArray(permission.conditions) && permission.conditions.length > 0
          )
        ) {
          /**
           * We only "check" when there are conditions to check against.
           * Otherwise, knowing there's a matching permission is enough.
           */
          try {
            const {
              data: { data },
            } = await post<
              { data: { data: boolean[] } },
              AxiosResponse<{ data: { data: boolean[] } }>
            >('/admin/permissions/check', {
              permissions: matchingPermissions.map(({ action, subject }) => ({
                action,
                subject,
              })),
            });

            return { name, hasPermission: Array.isArray(data) && data.every((v) => v === true) };
          } catch (err) {
            /**
             * We don't notify the user if the request fails.
             * Instead we declare they dont have the permission.
             *
             * TODO: is this accurate?
             */
            return { name, hasPermission: false };
          }
        }

        return { name, hasPermission: matchingPermissions.length > 0 };
      },
    }))
  );

  /**
   * This function is used to synchronise the hook when used in dynamic components
   *
   * TODO: Is this still needed?
   */
  const setIsLoading = useCallback(() => {
    setInternalIsLoading(true);
  }, []);

  const isLoading = internalIsLoading || queryResults.some((res) => res.isLoading);

  const data = queryResults.map((res) => res.data);

  /**
   * This hook originally would not return allowedActions
   * until all the checks were complete.
   */
  const allowedActions = (
    data.some((res) => res === undefined) ? defaultAllowedActions : data
  ).reduce((acc, permission) => {
    if (!permission) return acc;

    const { name, hasPermission } = permission;

    acc[`can${capitalize(name)}`] = hasPermission;

    return acc;
  }, {} as AllowedActions);

  return { allowedActions, isLoading, setIsLoading };
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
