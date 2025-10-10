import EventSource from 'eventsource';
import EventEmitter from 'node:events';
import type { CLIContext, CloudCliConfig } from '../types';

type Event = {
  type: string;
  data: string;
  lastEventId: string;
  origin: string;
};

type DeploymentNotificationData = {
  event:
    | 'deploymentFailed'
    | 'deploymentCompleted'
    | 'environmentCreationFailed'
    | 'environmentCreationCompleted';
  userId: string;
  projectName: string;
  environmentName: string;
  createdAt: string;
  message?: string;
};

export function notificationServiceFactory({ logger }: CLIContext) {
  return (url: string, token: string, cliConfig: CloudCliConfig) => {
    const CONN_TIMEOUT = Number(cliConfig.notificationsConnectionTimeout);
    const eventEmitter = new EventEmitter();

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
        eventEmitter.emit('connectionTimedOut');
      }, CONN_TIMEOUT); // 5 minutes
    };

    es.onopen = () => {
      resetTimeout();
    };
    es.onmessage = (event: Event) => {
      resetTimeout();
      if (!event.data) {
        return;
      }
      const data: DeploymentNotificationData = JSON.parse(event.data);

      if (data.message) {
        logger.log(data.message);
      }

      // Close connection when a specific event is received
      if (
        data.event === 'deploymentCompleted' ||
        data.event === 'deploymentFailed' ||
        data.event === 'environmentCreationFailed' ||
        data.event === 'environmentCreationCompleted'
      ) {
        clearTimeout(timeoutId);
        es.close();
      }
      eventEmitter.emit(data.event, data);
    };

    const waitForEnvironmentCreation = (environmentName: string) => {
      return new Promise((resolve, reject) => {
        eventEmitter.on('environmentCreationCompleted', (data: DeploymentNotificationData) => {
          if (data.environmentName !== environmentName) {
            return;
          }
          resolve('Environment created successfully');
          eventEmitter.removeAllListeners('environmentCreationCompleted');
        });
        eventEmitter.on('environmentCreationFailed', (data: DeploymentNotificationData) => {
          if (data.environmentName !== environmentName) {
            return;
          }
          reject(new Error(`Environment creation failed`, { cause: 'EnvironmentCreationFailed' }));
          eventEmitter.removeAllListeners('environmentCreationFailed');
        });

        eventEmitter.on('connectionTimedOut', () => {
          reject(new Error('Connection timed out'));
        });
      });
    };
    const close = () => {
      clearTimeout(timeoutId);
      es.close();
      eventEmitter.removeAllListeners();
    };
    return { waitForEnvironmentCreation, close };
  };
}
