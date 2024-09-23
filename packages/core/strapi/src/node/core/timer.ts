import { performance } from 'perf_hooks';

export interface TimeMeasurer {
  start: (name: string) => void;
  end: (name: string) => number;
  getTimings: () => Record<string, number>;
}

export function getTimer(): TimeMeasurer {
  const timings: Record<string, number> = {};
  const startTimes: Record<string, number> = {};

  function start(name: string): void {
    if (typeof startTimes[name] !== 'undefined') {
      throw new Error(`Timer "${name}" already started, cannot overwrite`);
    }

    startTimes[name] = performance.now();
  }

  function end(name: string): number {
    if (typeof startTimes[name] === 'undefined') {
      throw new Error(`Timer "${name}" never started, cannot end`);
    }

    timings[name] = performance.now() - startTimes[name];
    return timings[name];
  }

  return { start, end, getTimings: () => timings };
}

export const prettyTime = (timeInMs: number): string => {
  return `${Math.ceil(timeInMs)}ms`;
};
