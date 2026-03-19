import type { Core } from '@strapi/types';
import type { Sender } from './sender';

interface State {
  expires: number;
  counter: number;
}

function nextResetDate(): number {
  return Date.now() + 24 * 60 * 60 * 1000; // Now + 24 hours.
}

const createMiddleware = ({ sendEvent, strapi }: { sendEvent: Sender; strapi: Core.Strapi }) => {
  const state: State = {
    expires: nextResetDate(),
    counter: 0,
  };

  const middleware: Core.MiddlewareHandler = async (ctx, next) => {
    const { url, method } = ctx.request;

    // Only track API requests (skip static assets)
    const shouldTrack =
      !url.includes('.') &&
      url.includes(strapi.config.get('api.rest.prefix')) &&
      ['GET', 'PUT', 'POST', 'DELETE'].includes(method);

    if (shouldTrack) {
      // Reset counter if expired
      if (Date.now() > state.expires) {
        state.expires = nextResetDate();
        state.counter = 0;
      }

      // Track on response finish if under limit
      // Increment counter immediately to prevent race conditions
      if (state.counter < 1000) {
        state.counter += 1;

        let tracked = false;
        const trackOnFinish = () => {
          if (tracked) return;
          tracked = true;

          const statusCode = typeof ctx.response?.status === 'number' ? ctx.response.status : 500;
          const success = statusCode >= 200 && statusCode < 300;

          // Silently handle tracking errors - telemetry failures shouldn't affect the app
          Promise.resolve(
            sendEvent('didReceiveRequest', {
              eventProperties: {
                url: ctx.request.url,
                success,
                statusCode,
              },
            })
          ).catch(() => {
            // Ignore tracking errors
          });
        };

        // Track when response finishes (success or error)
        ctx.res.once('finish', trackOnFinish);
        ctx.res.once('close', trackOnFinish);
      }
    }

    await next();
  };

  return middleware;
};

export default createMiddleware;
