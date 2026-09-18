import { describe, expectTypeOf, test } from 'vitest';
import type { Core } from '@strapi/strapi';

// The koa context as applications receive it in controllers, without depending on koa themselves.
// `toEqualTypeOf` passes when the actual type is `any`, so every type below is guarded against it.
type Context = Parameters<Core.ControllerHandler>[0];
type Response = Context['response'];

type ErrorHelper = (response?: string | object, details?: object) => void;

/** One helper per 4xx and 5xx `node:http` status, registered at runtime by the server */
type ErrorHelperName =
  | 'badRequest'
  | 'unauthorized'
  | 'paymentRequired'
  | 'forbidden'
  | 'notFound'
  | 'methodNotAllowed'
  | 'notAcceptable'
  | 'proxyAuthenticationRequired'
  | 'requestTimeout'
  | 'conflict'
  | 'gone'
  | 'lengthRequired'
  | 'preconditionFailed'
  | 'payloadTooLarge'
  | 'uriTooLong'
  | 'unsupportedMediaType'
  | 'rangeNotSatisfiable'
  | 'expectationFailed'
  | 'imATeapot'
  | 'misdirectedRequest'
  | 'unprocessableEntity'
  | 'locked'
  | 'failedDependency'
  | 'tooEarly'
  | 'upgradeRequired'
  | 'preconditionRequired'
  | 'tooManyRequests'
  | 'requestHeaderFieldsTooLarge'
  | 'unavailableForLegalReasons'
  | 'internalServerError'
  | 'notImplemented'
  | 'badGateway'
  | 'serviceUnavailable'
  | 'gatewayTimeout'
  | 'httpVersionNotSupported'
  | 'variantAlsoNegotiates'
  | 'insufficientStorage'
  | 'loopDetected'
  | 'bandwidthLimitExceeded'
  | 'notExtended'
  | 'networkAuthenticationRequired';

describe('koa context', () => {
  test('is typed', () => {
    expectTypeOf<Context>().not.toBeAny();
    expectTypeOf<Response>().not.toBeAny();
  });
});

describe('query augmentation', () => {
  test('types the request query as parsed by the query middleware', () => {
    // `ReturnType<typeof qs.parse>` resolves to the last `qs.parse` overload, not `ParsedQs`
    type ParsedQuery = { [key: string]: unknown };

    expectTypeOf<Context['query']>().not.toBeAny();
    expectTypeOf<Context['query']>().toEqualTypeOf<ParsedQuery>();
    expectTypeOf<Context['request']['query']>().toEqualTypeOf<ParsedQuery>();
  });
});

describe('DefaultContextDelegatedResponse augmentation', () => {
  test('adds the error helpers to the context and the response', () => {
    expectTypeOf<Context[ErrorHelperName]>().not.toBeAny();
    expectTypeOf<Context[ErrorHelperName]>().toEqualTypeOf<ErrorHelper>();

    expectTypeOf<Response[ErrorHelperName]>().not.toBeAny();
    expectTypeOf<Response[ErrorHelperName]>().toEqualTypeOf<ErrorHelper>();
  });

  test('adds the success helpers to the context and the response', () => {
    for (const target of [{} as Context, {} as Response]) {
      expectTypeOf(target.send).not.toBeAny();
      expectTypeOf(target.send).toEqualTypeOf<(response: unknown, status?: number) => void>();

      expectTypeOf(target.created).not.toBeAny();
      expectTypeOf(target.created).toEqualTypeOf<(response?: unknown) => void>();

      expectTypeOf(target.deleted).not.toBeAny();
      expectTypeOf(target.deleted).toEqualTypeOf<(response?: unknown) => void>();
    }
  });

  test('accepts the documented arguments', () => {
    expectTypeOf<Context['notFound']>().toBeCallableWith();
    expectTypeOf<Context['badRequest']>().toBeCallableWith('Invalid payload', { field: 'title' });
    expectTypeOf<Context['send']>().toBeCallableWith({ data: [] }, 200);

    // @ts-expect-error the status must be a number
    expectTypeOf<Context['send']>().toBeCallableWith({ data: [] }, '200');
  });
});
