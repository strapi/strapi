import 'whatwg-fetch';
import { startsWith } from 'lodash';
import auth from 'utils/auth';

/**
 * Parses the JSON returned by a network request
 *
 * @param  {object} response A response from a network request
 *
 * @return {object}          The parsed JSON from the request
 */
function parseJSON(response) {
  return response.json();
}

/**
 * Checks if a network request came back fine, and throws an error if not
 *
 * @param  {object} response   A response from a network request
 *
 * @return {object|undefined} Returns either the response, or throws an error
 */
function checkStatus(response) {

  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  return parseJSON(response).then(responseFormatted => {
    const error = new Error(response.statusText);
    error.response = response;
    error.response.payload = responseFormatted;
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
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
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
      .then(() => {
        resolve(response);
      })
      .catch(() => {
        setTimeout(() => {
          return serverRestartWatcher(response)
            .then(resolve);
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
export default function request(url, options, shouldWatchServerRestart = false) {
  const optionsObj = options || {};

  // Set headers
  optionsObj.headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-Host': 'strapi',
  };

  const token = auth.getToken();

  if (token) {
    optionsObj.headers = Object.assign({
      'Authorization': `Bearer ${token}`,
    }, optionsObj.headers);
  }

  // Add parameters to url
  let urlFormatted = startsWith(url, '/')
    ? `${strapi.backendURL}${url}`
    : url;

  if (optionsObj && optionsObj.params) {
    const params = formatQueryParams(optionsObj.params);
    urlFormatted = `${url}?${params}`;
  }

  // Stringify body object
  if (optionsObj && optionsObj.body) {
    optionsObj.body = JSON.stringify(optionsObj.body);
  }

  return fetch(urlFormatted, optionsObj)
    .then(checkStatus)
    .then(parseJSON)
    .then((response) => {
      if (shouldWatchServerRestart) {
        return serverRestartWatcher(response);
      }

      return response;
    });
}
