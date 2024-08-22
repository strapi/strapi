import EventSource from 'eventsource';
import { CLIContext, type CloudCliConfig } from '../types';

const buildLogsServiceFactory = ({ logger }: CLIContext) => {
  return async (url: string, token: string, cliConfig: CloudCliConfig) => {
    const CONN_TIMEOUT = Number(cliConfig.buildLogsConnectionTimeout);
    const MAX_RETRIES = Number(cliConfig.buildLogsMaxRetries);

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let retries = 0;

      const connect = (url: string) => {
        const spinner = logger.spinner('Connecting to server to get build logs');
        spinner.start();
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
            if (spinner.isSpinning) {
              spinner.fail(
                'We were unable to connect to the server to get build logs at this time. This could be due to a temporary issue.'
              );
            }
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
          if (spinner.isSpinning) {
            spinner.succeed();
          }
          resetTimeout();
          const data = JSON.parse(event.data);
          logger.log(data.msg);
        });

        es.onerror = async () => {
          retries += 1;
          if (retries > MAX_RETRIES) {
            spinner.fail('We were unable to connect to the server to get build logs at this time.');
            es.close();
            clearExistingTimeout(); // Important to clear the event loop from remaining timeout - avoid to wait for nothing while the timeout is running
            reject(new Error('Max retries reached'));
          }
        };
      };

      connect(url);
    });
  };
};

export { buildLogsServiceFactory };
