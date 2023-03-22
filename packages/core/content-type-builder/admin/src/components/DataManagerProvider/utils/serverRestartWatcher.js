const SERVER_HAS_NOT_BEEN_KILLED_MESSAGE = 'did-not-kill-server';
const SERVER_HAS_BEEN_KILLED_MESSAGE = 'server is down';

/**
 * Server restart watcher
 * Sends an HEAD method to check if the server has been shut down correctly
 * and then pings until it's back on
 * @param response
 * @returns {object} the response data
 */
export default function serverRestartWatcher(response, didShutDownServer) {
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
          throw new Error(SERVER_HAS_BEEN_KILLED_MESSAGE);
        }

        if (!didShutDownServer) {
          throw new Error(SERVER_HAS_NOT_BEEN_KILLED_MESSAGE);
        }

        resolve(response);
      })
      .catch((err) => {
        setTimeout(() => {
          return serverRestartWatcher(
            response,
            err.message !== SERVER_HAS_NOT_BEEN_KILLED_MESSAGE
          ).then(resolve);
        }, 100);
      });
  });
}
