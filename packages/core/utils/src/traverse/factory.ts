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
  /**
   * Copies data the traversal does not own yet. Optional. It runs once, on the data the caller
   * passes in, and not on the values the traversal recurses into, which are already part of
   * that copy.
   */
  clone?(data: T): T;
  /** Runs at every level, on the data about to be walked. */
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

  /**
   * `owned` is true when `data` is part of a copy this traversal has already made.
   *
   * A parser's `set` and `remove` build new objects instead of writing into the data, so a
   * single copy of the caller's data is enough to keep it untouched, and to keep the result from
   * sharing objects with it. Values a handler recurses into come from that copy, from the
   * handler, or from a visitor's `set`, and are walked without copying them again. A visitor
   * must therefore `set` a fresh value, not one it shares with anything else.
   */
  const walk = async (
    visitor: Visitor,
    options: TraverseOptions,
    data: unknown,
    owned: boolean
  ): Promise<unknown> => {
    const { path = DEFAULT_PATH, parent, schema, getModel } = options ?? {};

    // interceptors
    for (const { predicate, handler } of state.interceptors) {
      if (predicate(data)) {
        // An interceptor can hand the caller's own data to the recursion (for example the
        // items of a filters array), so it only skips the copy when this level already owns it.
        return handler(visitor, options, data, { recurse: owned ? traverseOwned : traverse });
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
    let out = utils.transform(owned || !utils.clone ? data : utils.clone(data));
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
      // Handlers recurse into values of `out`, which this traversal owns.
      recurse: traverseOwned,
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

      // Awaited unconditionally. Most visitors are synchronous, and awaiting a
      // non-thenable still schedules a microtask, but skipping that await changes
      // the order of branches that recurse concurrently via Promise.all.
      //
      // That reordering used to drop nested populate in content-manager's
      // getQueryPopulate: a shallow `relation` write replaced the subtree a deeper
      // sibling had written at `relation.populate.component`. #27236 fixed that
      // visitor by merging paths. Re-measuring the skip afterward showed no
      // throughput gain, so the await stays.
      await visitor(visitorOptions, visitorUtils);

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

  // Entry point: the data comes from the caller, so it is copied before it is walked.
  const traverse: Traverse = (visitor, options, data) => walk(visitor, options, data, false);
  const traverseOwned: Traverse = (visitor, options, data) => walk(visitor, options, data, true);

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
