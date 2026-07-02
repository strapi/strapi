import { camelCase } from 'lodash/fp';
import { STATUS_CODES } from 'node:http';

export interface ErrorMethodEntry {
  /** HTTP status code (400–599). */
  code: number;
  /** Reason phrase from `node:http` `STATUS_CODES`, e.g. "Not Found". */
  statusName: string;
  /** camelCased helper name registered on the context, e.g. "notFound". */
  methodName: keyof ContextDelegatedResponseErrorMethods;
}

/**
 * Single source of truth for the generated error helpers: yields one entry per
 * 4xx/5xx `node:http` status. Both the runtime registration (`koa.ts`) and the
 * type/runtime sync test iterate this, so they cannot drift.
 */
export function* errorMethodEntries(): Generator<ErrorMethodEntry> {
  for (const [codeStr, statusName] of Object.entries(STATUS_CODES)) {
    const code = Number(codeStr);

    if (statusName && code >= 400 && code < 600) {
      yield {
        code,
        statusName,
        methodName: camelCase(statusName) as keyof ContextDelegatedResponseErrorMethods,
      };
    }
  }
}

export interface ContextDelegatedResponseErrorMethods {
  /** 400 Bad Request */
  badRequest(response?: string | object, details?: object): void;
  /** 401 Unauthorized */
  unauthorized(response?: string | object, details?: object): void;
  /** 402 Payment Required */
  paymentRequired(response?: string | object, details?: object): void;
  /** 403 Forbidden */
  forbidden(response?: string | object, details?: object): void;
  /** 404 Not Found */
  notFound(response?: string | object, details?: object): void;
  /** 405 Method Not Allowed */
  methodNotAllowed(response?: string | object, details?: object): void;
  /** 406 Not Acceptable */
  notAcceptable(response?: string | object, details?: object): void;
  /** 407 Proxy Authentication Required */
  proxyAuthenticationRequired(response?: string | object, details?: object): void;
  /** 408 Request Timeout */
  requestTimeout(response?: string | object, details?: object): void;
  /** 409 Conflict */
  conflict(response?: string | object, details?: object): void;
  /** 410 Gone */
  gone(response?: string | object, details?: object): void;
  /** 411 Length Required */
  lengthRequired(response?: string | object, details?: object): void;
  /** 412 Precondition Failed */
  preconditionFailed(response?: string | object, details?: object): void;
  /** 413 Payload Too Large */
  payloadTooLarge(response?: string | object, details?: object): void;
  /** 414 Uri Too Long */
  uriTooLong(response?: string | object, details?: object): void;
  /** 415 Unsupported Media Type */
  unsupportedMediaType(response?: string | object, details?: object): void;
  /** 416 Range Not Satisfiable */
  rangeNotSatisfiable(response?: string | object, details?: object): void;
  /** 417 Expectation Failed */
  expectationFailed(response?: string | object, details?: object): void;
  /** 418 Im A Teapot */
  imATeapot(response?: string | object, details?: object): void;
  /** 421 Misdirected Request */
  misdirectedRequest(response?: string | object, details?: object): void;
  /** 422 Unprocessable Entity */
  unprocessableEntity(response?: string | object, details?: object): void;
  /** 423 Locked */
  locked(response?: string | object, details?: object): void;
  /** 424 Failed Dependency */
  failedDependency(response?: string | object, details?: object): void;
  /** 425 Too Early */
  tooEarly(response?: string | object, details?: object): void;
  /** 426 Upgrade Required */
  upgradeRequired(response?: string | object, details?: object): void;
  /** 428 Precondition Required */
  preconditionRequired(response?: string | object, details?: object): void;
  /** 429 Too Many Requests */
  tooManyRequests(response?: string | object, details?: object): void;
  /** 431 Request Header Fields Too Large */
  requestHeaderFieldsTooLarge(response?: string | object, details?: object): void;
  /** 451 Unavailable For Legal Reasons */
  unavailableForLegalReasons(response?: string | object, details?: object): void;
  /** 500 Internal Server Error */
  internalServerError(response?: string | object, details?: object): void;
  /** 501 Not Implemented */
  notImplemented(response?: string | object, details?: object): void;
  /** 502 Bad Gateway */
  badGateway(response?: string | object, details?: object): void;
  /** 503 Service Unavailable */
  serviceUnavailable(response?: string | object, details?: object): void;
  /** 504 Gateway Timeout */
  gatewayTimeout(response?: string | object, details?: object): void;
  /** 505 Http Version Not Supported */
  httpVersionNotSupported(response?: string | object, details?: object): void;
  /** 506 Variant Also Negotiates */
  variantAlsoNegotiates(response?: string | object, details?: object): void;
  /** 507 Insufficient Storage */
  insufficientStorage(response?: string | object, details?: object): void;
  /** 508 Loop Detected */
  loopDetected(response?: string | object, details?: object): void;
  /** 509 Bandwidth Limit Exceeded */
  bandwidthLimitExceeded(response?: string | object, details?: object): void;
  /** 510 Not Extended */
  notExtended(response?: string | object, details?: object): void;
  /** 511 Network Authentication Required */
  networkAuthenticationRequired(response?: string | object, details?: object): void;
}

export interface ContextDelegatedResponseSuccessMethods {
  /** 200 */
  send(response: unknown, status?: number): void;
  /** 201 */
  created(response?: unknown): void;
  /** 204 | 200 */
  deleted(response?: unknown): void;
}
