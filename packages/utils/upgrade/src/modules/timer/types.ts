export interface Timer {
  get start(): number;
  get end(): number | null;
  get elapsedMs(): number;

  stop(): number;
  reset(): this;
}

export interface TimeInterval {
  start: number;
  end: number | null;
}
