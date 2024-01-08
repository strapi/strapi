import type { Timer as TimerInterface, TimeInterval } from './types';

export class Timer implements TimerInterface {
  private interval!: TimeInterval;

  constructor() {
    this.reset();
  }

  get elapsedMs() {
    const { start, end } = this.interval;

    return end ? end - start : Date.now() - start;
  }

  get end() {
    return this.interval.end;
  }

  get start() {
    return this.interval.start;
  }

  stop() {
    this.interval.end = Date.now();

    return this.elapsedMs;
  }

  reset() {
    this.interval = { start: Date.now(), end: null };

    return this;
  }
}

export const timerFactory = () => new Timer();
