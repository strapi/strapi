/**
 * The koa context the callbacks receive. `koa` is a peer dependency, which published contracts
 * cannot reference: `never` accepts a callback typed with any context.
 */
type Context = never;

/** A duration in milliseconds, or in units such as `{ min: 5 }`. */
type Duration =
  | number
  | Partial<Record<'ms' | 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year', number>>;

/**
 * Options of koa2-ratelimit's `RateLimit.middleware`, which ships no types. The
 * `plugin::email.rateLimit` middleware spreads its config over them. Same type as `@strapi/admin`'s,
 * which published contracts cannot reference: `@strapi/admin` is a peer dependency.
 */
export type RateLimitOptions = {
  /** How long to keep records of requests. */
  interval?: Duration;
  /** Requests allowed before responses are delayed. */
  delayAfter?: number;
  /** Base delay of a delayed response, multiplied by the number of recent hits. */
  timeWait?: Duration;
  /** Requests allowed per `interval` before responding with `statusCode`. */
  max?: number;
  message?: unknown;
  messageKey?: string;
  statusCode?: number;
  /** Whether to send the rate limit headers. */
  headers?: boolean;
  /** Whether failed requests (status >= 400) are not counted. */
  skipFailedRequests?: boolean;
  prefixKey?: string;
  prefixKeySeparator?: string;
  /** User ids that are never limited. */
  whitelist?: string[];
  store?: unknown;
  keyGenerator?: (ctx: Context) => string | Promise<string>;
  getUserIdFromKey?: (key: string) => string;
  skip?: (ctx: Context) => boolean | Promise<boolean>;
  getUserId?: (ctx: Context) => string | Promise<string>;
  handler?: (ctx: Context) => unknown;
  onLimitReached?: (ctx: Context) => unknown;
  weight?: (ctx: Context) => number | Promise<number>;
};
