import 'whatwg-fetch';
import startsWith from 'lodash/startsWith';
import auth from '../auth';

/**
 * Parses the JSON returned by a network request
 *
 * @param  {object} response A response from a network request
 *
 * @return {object}          The parsed JSON from the request
 */
function parseJSON(response) {
  return response.json ? response.json() : response;
}

/**
 * Checks if a network request came back fine, and throws an error if not
 *
 * @param  {object} response   A response from a network request
 *
 * @return {object|undefined} Returns either the response, or throws an error
 */
function checkStatus(response, checkToken = true) {
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
      const error = new Error(response.statusText);
      error.response = response;
      error.response.payload = responseFormatted;
      throw error;
    })
    .catch(() => {
      const error = new Error(response.statusText);
      error.response = response;

      throw error;
    });
}

/**
 * Format query params
 *
 * @param params
 * @returns {string}
 */
function formatQueryParams(params) {
  return Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

/**
 * Server restart watcher
 * @param response
 * @returns {object} the response data
 */
function serverRestartWatcher(response) {
  return new Promise((resolve) => {
    fetch(`${strapi.backendURL}/_health`, {
      method: 'HEAD',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
        'Keep-Alive': false,
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

/**
 * Requests a URL, returning a promise
 *
 * @param  {string} url       The URL we want to request
 * @param  {object} [options] The options we want to pass to "fetch"
 *
 * @return {object}           The response data
 */
export default function request(...args) {
  let [url, options = {}, shouldWatchServerRestart, stringify = true, ...rest] = args;
  let noAuth;

  try {
    [{ noAuth }] = rest;
  } catch (err) {
    noAuth = false;
  }

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
  url = startsWith(url, '/') ? `${strapi.backendURL}${url}` : url;

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
    .then(parseJSON)
    .then((response) => {
      if (shouldWatchServerRestart) {
        return serverRestartWatcher(response);
      }

      return response;
    });
}
