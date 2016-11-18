import 'whatwg-fetch';

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
 * @return {Promise} Returns either the response, or throws an error
 */
function checkStatus(response) {
  return new Promise((resolve) => {
    if (response.status >= 200 && response.status < 300) {
      return resolve(response);
    }

    return parseJSON(response)
      .then((data) => {
        const error = new Error(data.message || response.statusText);
        error.data = data;
        error.response = response;
        throw error;
      });
  });
}

/**
 * Requests a URL, returning a promise
 *
 * @param  {string} url       The URL we want to request
 * @param  {object} [options] The options we want to pass to "fetch"
 *
 * @return {object}           An object containing either "data" or "err"
 */
export default function request(url, options) {
  // Default headers
  const params = options || { };
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  params.headers = params && params.headers ? params.headers : defaultHeaders;

  return fetch(url, params)
    .then(checkStatus)
    .then(parseJSON)
    .then((data) => ({ data }))
    .catch((err) => ({ err }));
}
