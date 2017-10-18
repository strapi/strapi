import 'whatwg-fetch';

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
  return new Promise((resolve, reject) => {
    fetch(`${Strapi.apiUrl}/_health`, {
      method: 'HEAD',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
        'Keep-Alive': false
      }
    })
      .then(() => {
        resolve(response);
      })
      .catch(err => {
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
 export default function request(url, options = {}, shouldWatchServerRestart = false) {
   // Set headers
   options.headers = Object.assign({
     'Content-Type': 'application/json',
   }, options.headers);

   // Add parameters to url
   url = _.startsWith(url, '/')
     ? `${Strapi.apiUrl}${url}`
     : url;

   if (options && options.params) {
     const params = formatQueryParams(options.params);
     url = `${url}?${params}`;
   }

   // Stringify body object
   if (options && options.body) {
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
