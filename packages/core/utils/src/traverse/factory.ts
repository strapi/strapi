/* eslint-disable @typescript-eslint/no-loop-func */
import {
  AnyAttribute,
  Attribute,
  ComponentAttribute,
  DynamicZoneAttribute,
  Model,
  RelationalAttribute,
} from '../types';

export interface Path {
  raw: string | null;
  attribute: string | null;
}

export interface Parent {
  attribute?: Attribute;
  key: string | null;
  path: Path;
  schema: Model;
}

export interface TraverseOptions {
  schema: Model;
  path?: Path;
  parent?: Parent;
  getModel(uid: string): Model;
}

export interface VisitorOptions {
  data: unknown;
  value: unknown;
  schema: Model;
  key: string;
  attribute?: AnyAttribute;
  path: Path;
  parent?: Parent;
  getModel(uid: string): Model;
}

export type Traverse = (
  visitor: Visitor,
  options: TraverseOptions,
  data: unknown
) => Promise<unknown>;

export interface Visitor {
  (visitorOptions: VisitorOptions, opts: Pick<TransformUtils, 'set' | 'remove'>): void;
}

interface Interceptor<T = unknown> {
  predicate(data: unknown): data is T;
  handler(
    visitor: Visitor,
    options: TraverseOptions,
    data: T,
    recurseOptions: { recurse: Traverse }
  ): void;
}

interface ParseUtils<T> {
  transform(data: T): unknown;
  remove(key: string, data: T): unknown;
  set(key: string, value: unknown, data: T): unknown;
  keys(data: T): string[];
  get(key: string, data: T): unknown;
}

interface Parser<T = unknown> {
  predicate(data: unknown): data is T;
  parser(data: T): ParseUtils<T>;
}

interface Ignore {
  (ctx: Context): boolean;
}

interface AttributeHandler<AttributeType = Attribute> {
  predicate(ctx: Context<AttributeType>): boolean;
  handler(ctx: Context<AttributeType>, opts: Pick<TransformUtils, 'set' | 'recurse'>): void;
}
interface CommonHandler<AttributeType = Attribute> {
  predicate(ctx: Context<AttributeType>): boolean;
  handler(ctx: Context<AttributeType>, opts: Pick<TransformUtils, 'set' | 'recurse'>): void;
}

export interface TransformUtils {
  remove(key: string): void;
  set(key: string, value: unknown): void;
  recurse: Traverse;
}

interface Context<AttributeType = Attribute> {
  key: string;
  value: unknown;
  attribute: AttributeType;
  schema: Model;
  path: Path;
  data: unknown;
  visitor: Visitor;
  parent?: Parent;
  getModel(uid: string): Model;
}

interface State {
  parsers: Parser[];
  interceptors: Interceptor[];
  ignore: Ignore[];
  handlers: {
    attributes: AttributeHandler[];
    common: CommonHandler[];
  };
}

const DEFAULT_PATH = { raw: null, attribute: null } satisfies Path;

export default () => {
  const state: State = {
    parsers: [],
    interceptors: [],
    ignore: [],
    handlers: {
      attributes: [],
      common: [],
    },
  };

  const traverse: Traverse = async (visitor, options, data) => {
    const { path = DEFAULT_PATH, parent, schema, getModel } = options ?? {};

    // interceptors
    for (const { predicate, handler } of state.interceptors) {
      if (predicate(data)) {
        return handler(visitor, options, data, { recurse: traverse });
      }
    }

    // parsers
    const parser = state.parsers.find((parser) => parser.predicate(data))?.parser;
    const utils = parser?.(data);

    // Return the data untouched if we don't know how to traverse it
    if (!utils) {
      return data;
    }

    // main loop
    let out = utils.transform(data);
    const keys = utils.keys(out);

    // Built once per traversal rather than once per key. `state.handlers` is populated
    // while the traversal is being defined and is fixed by the time it runs, so spreading
    // both lists on every key allocated a fresh array to hold the same handlers. This
    // loop runs for every key of every node of every query, which made it one of the
    // hottest allocation sites in a request.
    const handlers = [...state.handlers.common, ...state.handlers.attributes];

    // Also hoisted: none of these close over `key` (each method takes it as an argument),
    // so the previous code allocated three closures per key to no end. They still mutate
    // the same `out` binding, so behaviour is unchanged.
    const transformUtils: TransformUtils = {
      remove(key) {
        out = utils.remove(key, out);
      },
      set(key, value) {
        out = utils.set(key, value, out);
      },
      recurse: traverse,
    };

    // Pre-picked instead of calling lodash `pick` per key, which allocated both the
    // key-list array literal and a fresh result object every time.
    const visitorUtils: Pick<TransformUtils, 'set' | 'remove'> = {
      remove: transformUtils.remove,
      set: transformUtils.set,
    };
    const handlerUtils: Pick<TransformUtils, 'set' | 'recurse'> = {
      set: transformUtils.set,
      recurse: transformUtils.recurse,
    };

    for (const key of keys) {
      const attribute = schema?.attributes?.[key];

      // The attribute segment only grows when the key maps to an attribute; otherwise the
      // parent's value carries through unchanged.
      let attributePath = path.attribute;
      if (attribute != null) {
        attributePath = path.attribute == null ? key : `${path.attribute}.${key}`;
      }

      // A single literal rather than a spread followed by conditional assignment: the
      // spread produced an object whose hidden class then transitioned on each write.
      // `Path` is closed over `raw` and `attribute` and callers never supply their own,
      // so nothing can be dropped by building it directly.
      const newPath: Path = {
        raw: path.raw == null ? key : `${path.raw}.${key}`,
        attribute: attributePath,
      };

      // visitors
      const visitorOptions: VisitorOptions = {
        key,
        value: utils.get(key, out),
        attribute,
        schema,
        path: newPath,
        data: out,
        getModel,
        parent,
      };

      // Awaited only when the visitor actually returns something thenable. Most visitors
      // are synchronous for most keys, and `await` on a non-thenable still allocates a
      // promise and defers the rest of the loop to a microtask.
      const visited = visitor(visitorOptions, visitorUtils) as unknown;

      if (visited != null && typeof (visited as PromiseLike<void>).then === 'function') {
        await visited;
      }

      const value = utils.get(key, out);

      const createContext = (): Context => ({
        key,
        value,
        attribute,
        schema,
        path: newPath,
        data: out,
        visitor,
        getModel,
        parent,
      });

      // ignore
      const ignoreCtx = createContext();
      const shouldIgnore = state.ignore.some((predicate) => predicate(ignoreCtx));

      if (shouldIgnore) {
        continue;
      }

      // handlers
      //
      // `for await` over a plain array awaits every element, allocating a promise per
      // handler per key even though the elements are ordinary objects. A plain `for...of`
      // with explicit thenable checks is equivalent for non-promise elements, and the
      // predicates in practice are synchronous.
      for (const handler of handlers) {
        const ctx = createContext();

        // A fresh context per handler is deliberate: a handler may call `set`, which
        // reassigns `out`, and the next handler must observe the updated `data`.
        const predicated = handler.predicate(ctx) as unknown;
        const pass =
          predicated != null && typeof (predicated as PromiseLike<boolean>).then === 'function'
            ? await (predicated as PromiseLike<boolean>)
            : predicated;

        if (pass) {
          const handled = handler.handler(ctx, handlerUtils) as unknown;

          if (handled != null && typeof (handled as PromiseLike<void>).then === 'function') {
            await handled;
          }
        }
      }
    }

    return out;
  };

  return {
    traverse,

    intercept<T>(predicate: Interceptor<T>['predicate'], handler: Interceptor<T>['handler']) {
      state.interceptors.push({ predicate, handler });
      return this;
    },

    parse<T>(predicate: Parser<T>['predicate'], parser: Parser<T>['parser']) {
      state.parsers.push({ predicate, parser });
      return this;
    },

    ignore(predicate: Ignore) {
      state.ignore.push(predicate);
      return this;
    },

    on(predicate: CommonHandler['predicate'], handler: CommonHandler['handler']) {
      state.handlers.common.push({ predicate, handler });
      return this;
    },

    onAttribute(predicate: AttributeHandler['predicate'], handler: AttributeHandler['handler']) {
      state.handlers.attributes.push({ predicate, handler });
      return this;
    },

    onRelation(handler: AttributeHandler<RelationalAttribute>['handler']) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'relation', handler);
    },

    onMedia(handler: AttributeHandler<RelationalAttribute>['handler']) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'media', handler);
    },

    onComponent(handler: AttributeHandler<ComponentAttribute>['handler']) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'component', handler);
    },

    onDynamicZone(handler: AttributeHandler<DynamicZoneAttribute>['handler']) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'dynamiczone', handler);
    },
  };
};
