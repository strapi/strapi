import type { Core } from '@strapi/types';
import type { Sender } from './sender';

interface State {
  expires: number;
  counter: number;
}

function nextResetDate(): number {
  return Date.now() + 24 * 60 * 60 * 1000; // Now + 24 hours.
}

const createMiddleware = ({ sendEvent }: { sendEvent: Sender }) => {
  const state: State = {
    expires: nextResetDate(),
    counter: 0,
  };

  const middleware: Core.MiddlewareHandler = async (ctx, next) => {
    const { url, method } = ctx.request;

    if (!url.includes('.') && ['GET', 'PUT', 'POST', 'DELETE'].includes(method)) {
      if (Date.now() > state.expires) {
        state.expires = nextResetDate();
        state.counter = 0;
      }

      // Send max. 1000 events per day.
      if (state.counter < 1000) {
        sendEvent('didReceiveRequest', { eventProperties: { url: ctx.request.url } });

        // Increase counter.
        state.counter += 1;
      }
    }

    await next();
  };

  return middleware;
};

export default createMiddleware;
