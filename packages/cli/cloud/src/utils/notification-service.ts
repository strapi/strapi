import EventSource from 'eventsource';
import type { CLIContext } from '../types';

type Event = {
  type: string;
  data: string;
  lastEventId: string;
  origin: string;
};

const CONN_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function notificationServiceFactory({ logger }: CLIContext) {
  return (url: string, token: string) => {
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
