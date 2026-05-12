/* eslint-disable @typescript-eslint/no-var-requires */
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Core } from '@strapi/types';

const TRACER_NAME = '@strapi/core.bcryptjs';

type CompareFn = typeof import('bcryptjs').compare;
type HashFn = typeof import('bcryptjs').hash;

let compareOriginal: CompareFn | null = null;
let hashOriginal: HashFn | null = null;

function isTracingOn(strapi: Core.Strapi): boolean {
  return strapi.config.get('server.observability.tracing.enabled') === true;
}

function recordBcryptSpan<T>(name: 'compare' | 'hash', run: () => T): T {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(`bcryptjs.${name}`, { kind: SpanKind.INTERNAL }, (span) => {
    try {
      const out = run() as T & Promise<unknown>;
      if (out != null && typeof (out as Promise<unknown>).then === 'function') {
        return (out as Promise<unknown>).finally(() => {
          span.end();
        }) as T;
      }
      span.end();
      return out;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      throw error;
    }
  });
}

/**
 * Wraps bcryptjs `compare` / `hash` so password work appears in traces (e.g. between Knex spans on login).
 * Skips callback-style calls; patches the resolved module once per process when tracing is enabled.
 */
export function attachBcryptjsTracing(strapi: Core.Strapi): void {
  if (!isTracingOn(strapi) || compareOriginal) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs') as {
      compare: CompareFn;
      hash: HashFn;
    };

    compareOriginal = bcrypt.compare.bind(bcrypt);
    hashOriginal = bcrypt.hash.bind(bcrypt);

    bcrypt.compare = new Proxy(compareOriginal, {
      apply(target, thisArg, args: unknown[]) {
        if (args.length > 2 && typeof args[2] === 'function') {
          return Reflect.apply(target, thisArg, args);
        }
        return recordBcryptSpan('compare', () => Reflect.apply(target, thisArg, args));
      },
    }) as CompareFn;

    bcrypt.hash = new Proxy(hashOriginal, {
      apply(target, thisArg, args: unknown[]) {
        const last = args[args.length - 1];
        if (typeof last === 'function') {
          return Reflect.apply(target, thisArg, args);
        }
        return recordBcryptSpan('hash', () => Reflect.apply(target, thisArg, args));
      },
    }) as HashFn;
  } catch {
    /* bcryptjs not resolvable — skip */
  }
}

export function disposeBcryptjsTracing(): void {
  if (!compareOriginal || !hashOriginal) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs') as { compare: CompareFn; hash: HashFn };
    bcrypt.compare = compareOriginal;
    bcrypt.hash = hashOriginal;
  } catch {
    /* ignore */
  }

  compareOriginal = null;
  hashOriginal = null;
}
