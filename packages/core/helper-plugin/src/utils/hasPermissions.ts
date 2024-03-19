import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios'; // TODO: To remove when we change the position of the hasPermissions function
import qs from 'qs'; // TODO: To remove when we change the position of the hasPermissions function

import { auth } from './auth'; // TODO: To remove when we change the position of the hasPermissions function

import type { Permission } from '../features/RBAC';
import type { GenericAbortSignal } from 'axios';

/**
 * getFetchClient implementation code.
 * TODO: To remove when we change the position of the hasPermissions function and use instead the getFetchClient function from the admin.
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
// getFetchClient end code.

type PermissionToCheckAgainst = Pick<Permission, 'action' | 'subject'> &
  Partial<Pick<Permission, 'actionParameters' | 'conditions' | 'properties'>>;

const findMatchingPermissions = (
  userPermissions: Permission[],
  permissions: PermissionToCheckAgainst[]
) =>
  userPermissions.reduce<Permission[]>((acc, curr) => {
    const associatedPermission = permissions.find(
      (perm) => perm.action === curr.action && perm.subject === curr.subject
    );

    if (associatedPermission) {
      acc.push(curr);
    }

    return acc;
  }, []);

const formatPermissionsForRequest = (permissions: Permission[]) =>
  permissions.map((permission) => {
    if (!permission.action) {
      return {};
    }

    const returnedPermission: Partial<Permission> = {
      action: permission.action,
    };

    if (permission.subject) {
      returnedPermission.subject = permission.subject;
    }

    return returnedPermission;
  });

/**
 * This should fail if there are no permissions or if there are permissions but no conditions
 */
const shouldCheckPermissions = (permissions: Permission[]) =>
  permissions.length > 0 &&
  permissions.every((perm) => Array.isArray(perm.conditions) && perm.conditions.length > 0);

const hasPermissions = async (
  userPermissions: Permission[],
  permissions: PermissionToCheckAgainst[],
  signal?: GenericAbortSignal
) => {
  if (!permissions || !permissions.length) {
    return true;
  }

  const matchingPermissions = findMatchingPermissions(userPermissions, permissions);

  if (shouldCheckPermissions(matchingPermissions)) {
    let hasPermission = false;

    try {
      const {
        data: { data },
      } = await getFetchClient().post<{ data: boolean[] }>(
        '/admin/permissions/check',
        {
          permissions: formatPermissionsForRequest(matchingPermissions),
        },
        { signal }
      );

      hasPermission = data.every((v) => v === true);
    } catch (err) {
      console.error('Error while checking permissions', err);
    }

    return hasPermission;
  }

  return matchingPermissions.length > 0;
};

export {
  hasPermissions,
  findMatchingPermissions,
  formatPermissionsForRequest,
  shouldCheckPermissions,
};

export type { PermissionToCheckAgainst };
