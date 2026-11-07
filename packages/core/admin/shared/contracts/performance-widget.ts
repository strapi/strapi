/** How the server bounded the JSON Lines read for performance homepage widgets. */
export type PerformanceWidgetTailWindow = {
  maxNonEmptyLines: number;
  maxTailBytes: number;
};
