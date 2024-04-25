import EventSource from 'eventsource';
import { CLIContext } from '../types';

const buildLogsServiceFactory = ({ logger }: CLIContext) => {
  return async (url: string, token: string) => {
    const CONN_TIMEOUT = 20000; // 2 mins
    const MAX_RETRIES = 5;

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let retries = 0;

      const connect = (url: string) => {
        const es = new EventSource(`${url}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const clearExistingTimeout = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };

        const resetTimeout = () => {
          clearExistingTimeout();
          timeoutId = setTimeout(() => {
            logger.log(
              'We were unable to connect to the server to get build logs at this time. This could be due to a temporary issue.'
            );
            es.close();
            reject(new Error('Connection timed out'));
          }, CONN_TIMEOUT);
        };

        es.onopen = resetTimeout;

        es.addEventListener('finished', (event) => {
          const data = JSON.parse(event.data);
          logger.log(data.msg);
          es.close();
          clearExistingTimeout();
          resolve(null);
        });

        es.addEventListener('log', (event) => {
          resetTimeout();
          const data = JSON.parse(event.data);
          logger.log(data.msg);
        });

        es.onerror = async () => {
          retries += 1;
          if (retries > MAX_RETRIES) {
            logger.log('We were unable to connect to the server to get build logs at this time.');
            es.close();
            reject(new Error('Max retries reached'));
          }
          logger.log('Connection lost. Retrying...');
        };
      };

      connect(url);
    });
  };
};

export { buildLogsServiceFactory };
