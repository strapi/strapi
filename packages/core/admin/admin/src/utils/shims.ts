/* -------------------------------------------------------------------------------------------------
 * requestIdleCallbackShim
 * -----------------------------------------------------------------------------------------------*/
const requestIdleCallbackShim: Window['requestIdleCallback'] = (callback) => {
  const start = Date.now();

  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining() {
        return Math.max(0, Date.now() - start);
      },
    });
  }, 1) as unknown as ReturnType<Window['requestIdleCallback']>;
};

const _requestIdleCallback =
  typeof requestIdleCallback === 'undefined' ? requestIdleCallbackShim : requestIdleCallback;

/* -------------------------------------------------------------------------------------------------
 * cancelIdleCallbackShim
 * -----------------------------------------------------------------------------------------------*/
const cancelIdleCallbackShim: Window['cancelIdleCallback'] = (handle: unknown) => {
  return clearTimeout(handle as any);
};

const _cancelIdleCallback =
  typeof cancelIdleCallback === 'undefined' ? cancelIdleCallbackShim : cancelIdleCallback;

export { _requestIdleCallback as requestIdleCallback };
export { _cancelIdleCallback as cancelIdleCallback };
