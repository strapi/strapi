import EventSource from 'eventsource';
import type { CLIContext, CloudCliConfig } from '../types';

type Event = {
  type: string;
  data: string;
  lastEventId: string;
  origin: string;
};

export function notificationServiceFactory({ logger }: CLIContext) {
  return (url: string, token: string, cliConfig: CloudCliConfig) => {
    const CONN_TIMEOUT = Number(cliConfig.notificationsConnectionTimeout);

    const es = new EventSource(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logger.log(
          'We were unable to connect to the server at this time. This could be due to a temporary issue. Please try again in a moment.'
        );
        es.close();
      }, CONN_TIMEOUT); // 5 minutes
    };

    es.onopen = resetTimeout;
    es.onmessage = (event: Event) => {
      resetTimeout();
      const data = JSON.parse(event.data);

      if (data.message) {
        logger.log(data.message);
      }

      // Close connection when a specific event is received
      if (data.event === 'deploymentFinished' || data.event === 'deploymentFailed') {
        es.close();
      }
    };
  };
}
