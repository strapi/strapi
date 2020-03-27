'use strict';

const createMiddleware = ({ sendEvent }) => {
  const _state = {
    currentDay: null,
    counter: 0,
  };

  return async (ctx, next) => {
    const { url, method } = ctx.request;

    if (!url.includes('.') && ['GET', 'PUT', 'POST', 'DELETE'].includes(method)) {
      const dayOfMonth = new Date().getDate();

      if (dayOfMonth !== _state.currentDay) {
        _state.currentDay = dayOfMonth;
        _state.counter = 0;
      }

      // Send max. 1000 events per day.
      if (_state.counter < 1000) {
        sendEvent('didReceiveRequest', { url: ctx.request.url });

        // Increase counter.
        _state.counter++;
      }
    }

    await next();
  };
};

module.exports = createMiddleware;
