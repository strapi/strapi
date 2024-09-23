import type { Core } from '@strapi/types';
import type { Sender } from './sender';

interface State {
  currentDay: number | null;
  counter: number;
}

const createMiddleware = ({ sendEvent }: { sendEvent: Sender }) => {
  const state: State = {
    currentDay: null,
    counter: 0,
  };

  const middleware: Core.MiddlewareHandler = async (ctx, next) => {
    const { url, method } = ctx.request;

    if (!url.includes('.') && ['GET', 'PUT', 'POST', 'DELETE'].includes(method)) {
      const dayOfMonth = new Date().getDate();

      if (dayOfMonth !== state.currentDay) {
        state.currentDay = dayOfMonth;
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
