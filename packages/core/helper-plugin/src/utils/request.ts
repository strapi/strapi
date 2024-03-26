import startsWith from 'lodash/startsWith';

import { auth } from './auth';
import { once } from './once';

/**
 * Parses the JSON returned by a network request
 */
async function parseJSON<ResponseType>(response: Response | ResponseType): Promise<ResponseType> {
  if (response instanceof Response) {
    return response.json();
  }

  return response;
}

interface CustomError extends Error {
  response?: Response & { payload?: unknown };
}

/**
 * Checks if a network request came back fine, and throws an error if not
 */
async function checkStatus(response: Response, checkToken = true): Promise<Response> {
  if ((response.status >= 200 && response.status < 300) || response.status === 0) {
    return response;
  }

  // TODO handle 403...

  if (response.status === 401 && auth.getToken() && checkToken) {
    // Temporary fix until we create a new request helper
    auth.clearAppStorage();
    window.location.reload();
  }

  return parseJSON(response)
    .then((responseFormatted) => {
      const error: CustomError = new Error(response.statusText);
      error.response = response;
      error.response.payload = responseFormatted;
      throw error;
    })
    .catch(() => {
      const error: CustomError = new Error(response.statusText);
      error.response = response;

      throw error;
    });
}

function formatQueryParams(params: Record<string, string>): string {
  return Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

/**
 * Server restart watcher
 */
async function serverRestartWatcher<ResponseType>(response: ResponseType): Promise<ResponseType> {
  return new Promise((resolve) => {
    fetch(`${window.strapi.backendURL}/_health`, {
      method: 'HEAD',
      mode: 'no-cors',
      keepalive: false,
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (res.status >= 400) {
          throw new Error('not available');
        }

        resolve(response);
      })
      .catch(() => {
        setTimeout(() => {
          return serverRestartWatcher(response).then(resolve);
        }, 100);
      });
  });
}

const warnOnce = once(console.warn);

// eslint-disable-next-line no-undef
interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Requests a URL, returning a promise
 *
 * @deprecated use `useFetchClient` instead.
 */
export async function request<ResponseType = unknown>(
  url: string,
  options: RequestOptions = {},
  shouldWatchServerRestart?: boolean,
  stringify = true,
  { noAuth }: { noAuth?: boolean } = { noAuth: false }
): Promise<ResponseType> {
  warnOnce(
    'The `request` function is deprecated and will be removed in the next major version. Please use `useFetchClient` instead.'
  );

  // Set headers
  if (!options.headers) {
    options.headers = Object.assign(
      {
        'Content-Type': 'application/json',
      },
      options.headers
    );
  }

  const token = auth.getToken();

  if (token && !noAuth) {
    options.headers = Object.assign(
      {
        Authorization: `Bearer ${token}`,
      },
      options.headers
    );
  }

  // Add parameters to url
  url = startsWith(url, '/') ? `${window.strapi.backendURL}${url}` : url;

  if (options && options.params) {
    const params = formatQueryParams(options.params);
    url = `${url}?${params}`;
  }

  // Stringify body object
  if (options && options.body && stringify) {
    options.body = JSON.stringify(options.body);
  }

  return fetch(url, options)
    .then(checkStatus)
    .then(parseJSON<ResponseType>)
    .then((response) => {
      if (shouldWatchServerRestart) {
        return serverRestartWatcher<ResponseType>(response);
      }

      return response;
    });
}
