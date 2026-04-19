import type * as Koa from 'koa';
import type {} from 'koa-body';

type ID = number | string;

export type Data = {
  id?: ID;
  __component?: string;
  __type?: string;
  [key: string]: string | number | ID | boolean | null | undefined | Date | Data | Data[];
};

export type Config = Record<string, unknown>;

export interface RelationOrderingOptions {
  strict?: boolean;
}

export interface Attribute {
  type: string;
  writable?: boolean;
  visible?: boolean;
  relation?: string;
  private?: boolean;
  [key: string]: any;
}

export interface RelationalAttribute extends Attribute {
  type: 'relation';
  relation: string;
  target?: string;
}
export interface ComponentAttribute extends Attribute {
  type: 'component';
  component: string;
  repeatable?: boolean;
}
export interface DynamicZoneAttribute extends Attribute {
  type: 'dynamiczone';
  components: string[];
}

export interface ScalarAttribute extends Attribute {
  type:
    | 'string'
    | 'text'
    | 'richtext'
    | 'integer'
    | 'biginteger'
    | 'float'
    | 'decimal'
    | 'date'
    | 'time'
    | 'datetime'
    | 'timestamp'
    | 'enumeration'
    | 'boolean'
    | 'json'
    | 'blocks'
    | 'uid'
    | 'password'
    | 'email'
    | 'media';
}

export type AnyAttribute =
  | ScalarAttribute
  | RelationalAttribute
  | ComponentAttribute
  | DynamicZoneAttribute;

export type Kind = 'singleType' | 'collectionType';

export interface Model {
  modelType: 'contentType' | 'component';
  uid: string;
  kind?: Kind;
  info?: {
    displayName: string;
    singularName?: string;
    pluralName?: string;
  };
  options?: {
    populateCreatorFields?: boolean;
    draftAndPublish?: boolean;
  };
  privateAttributes?: string[];
  attributes: Record<string, AnyAttribute>;
}

declare module 'koa' {
  interface Request extends Koa.BaseRequest {
    route: RouteInfo;
  }

  interface ExtendableContext {
    /* 400 */ badRequest(response?: string | object, details?: object): void;
    /* 401 */ unauthorized(response?: string | object, details?: object): void;
    /* 402 */ paymentRequired(response?: string | object, details?: object): void;
    /* 403 */ forbidden(response?: string | object, details?: object): void;
    /* 404 */ notFound(response?: string | object, details?: object): void;
    /* 405 */ methodNotAllowed(response?: string | object, details?: object): void;
    /* 406 */ notAcceptable(response?: string | object, details?: object): void;
    /* 407 */ proxyAuthenticationRequired(response?: string | object, details?: object): void;
    /* 408 */ requestTimeout(response?: string | object, details?: object): void;
    /* 409 */ conflict(response?: string | object, details?: object): void;
    /* 410 */ gone(response?: string | object, details?: object): void;
    /* 411 */ lengthRequired(response?: string | object, details?: object): void;
    /* 412 */ preconditionFailed(response?: string | object, details?: object): void;
    /* 413 */ payloadTooLarge(response?: string | object, details?: object): void;
    /* 414 */ uriTooLong(response?: string | object, details?: object): void;
    /* 415 */ unsupportedMediaType(response?: string | object, details?: object): void;
    /* 416 */ rangeNotSatisfiable(response?: string | object, details?: object): void;
    /* 417 */ expectationFailed(response?: string | object, details?: object): void;
    /* 418 */ imATeapot(response?: string | object, details?: object): void;
    /* 421 */ misdirectedRequest(response?: string | object, details?: object): void;
    /* 422 */ unprocessableEntity(response?: string | object, details?: object): void;
    /* 423 */ locked(response?: string | object, details?: object): void;
    /* 424 */ failedDependency(response?: string | object, details?: object): void;
    /* 425 */ tooEarly(response?: string | object, details?: object): void;
    /* 426 */ upgradeRequired(response?: string | object, details?: object): void;
    /* 428 */ preconditionRequired(response?: string | object, details?: object): void;
    /* 429 */ tooManyRequests(response?: string | object, details?: object): void;
    /* 431 */ requestHeaderFieldsTooLarge(response?: string | object, details?: object): void;
    /* 451 */ unavailableForLegalReasons(response?: string | object, details?: object): void;
    /* 500 */ internalServerError(response?: string | object, details?: object): void;
    /* 501 */ notImplemented(response?: string | object, details?: object): void;
    /* 502 */ badGateway(response?: string | object, details?: object): void;
    /* 503 */ serviceUnavailable(response?: string | object, details?: object): void;
    /* 504 */ gatewayTimeout(response?: string | object, details?: object): void;
    /* 505 */ httpVersionNotSupported(response?: string | object, details?: object): void;
    /* 506 */ variantAlsoNegotiates(response?: string | object, details?: object): void;
    /* 507 */ insufficientStorage(response?: string | object, details?: object): void;
    /* 508 */ loopDetected(response?: string | object, details?: object): void;
    /* 509 */ bandwidthLimitExceeded(response?: string | object, details?: object): void;
    /* 510 */ notExtended(response?: string | object, details?: object): void;
    /* 511 */ networkAuthenticationRequired(response?: string | object, details?: object): void;

    /* 200 */ send(response: unknown, status?: number): void;
    /* 201 */ created(response?: unknown): void;
    /* 204 | 200 */ deleted(response?: unknown): void;
  }
}

export interface RouteInfo {
  endpoint: string;
  controller: string;
  action: string;
  verb: string;
  plugin: string;
}

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
