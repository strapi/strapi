export type PerformanceWidgetFingerprint = { fingerprint: string; count: number; totalMs: number };

export type PerformanceWidgetSnapshot =
  | {
      source: 'artifact';
      artifact: {
        configured: true;
        fileFound: boolean;
        batchesParsed: number;
        lastGeneratedAt: string | null;
        totals: {
          slowQueryCount: number;
          requestCount: number;
          slowRequestCount: number;
          maxP95Ms: number;
          maxP99Ms: number;
        };
        topFingerprints: PerformanceWidgetFingerprint[];
      };
      databasePerformanceEnabled: boolean;
      requestTimelineEnabled: boolean;
    }
  | {
      source: 'none';
      artifact: { configured: false };
      databasePerformanceEnabled: boolean;
      requestTimelineEnabled: boolean;
      hint: string;
    };
