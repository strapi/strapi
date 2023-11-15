interface Times {
  start: number;
  end: number | null;
}

export interface Timer {
  get start(): number;
  get end(): number | null;
  get elapsed(): number;

  stop(): number;
  reset(): void;
}

export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
export const ONE_HOUR_MS = ONE_MINUTE_MS * 60;

export const createTimer = (): Timer => {
  const times: Times = {
    start: Date.now(),
    end: null,
  };

  const getElapsedMs = () => (times.end ? times.end - times.start : Date.now() - times.start);

  const stop = () => {
    times.end = Date.now();
    return getElapsedMs();
  };

  const reset = () => {
    times.end = null;
    times.start = Date.now();
  };

  return {
    get elapsed() {
      return getElapsedMs();
    },

    get start() {
      return times.start;
    },

    get end() {
      return times.end;
    },

    stop,
    reset,
  };
};
