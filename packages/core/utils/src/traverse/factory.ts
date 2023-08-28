/* eslint-disable @typescript-eslint/no-loop-func */
import { isNil, pick } from 'lodash/fp';
import {
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

export interface TraverseOptions {
  path?: Path;
  schema: Model;
}

export interface VisitorOptions {
  data: unknown;
  value: unknown;
  schema: Model;
  key: string;
  attribute: Attribute;
  path: Path;
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
  set(key: string, valeu: unknown, data: T): unknown;
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
  set(key: string, valeu: unknown): void;
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

const DEFAULT_PATH = { raw: null, attribute: null };

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
    const { path = DEFAULT_PATH, schema } = options ?? {};

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

    for (const key of keys) {
      const attribute =
        schema?.attributes?.[key] ??
        // FIX: Needed to not break existing behavior on the API.
        //      It looks for the attribute in the DB metadata when the key is in snake_case
        schema?.attributes?.[strapi.db.metadata.get(schema?.uid).columnToAttribute[key]];

      const newPath = { ...path };

      newPath.raw = isNil(path.raw) ? key : `${path.raw}.${key}`;

      if (!isNil(attribute)) {
        newPath.attribute = isNil(path.attribute) ? key : `${path.attribute}.${key}`;
      }

      // visitors

      const visitorOptions: VisitorOptions = {
        key,
        value: utils.get(key, out),
        attribute,
        schema,
        path: newPath,
        data: out,
      };

      const transformUtils: TransformUtils = {
        remove(key) {
          out = utils.remove(key, out);
        },
        set(key, value) {
          out = utils.set(key, value, out);
        },
        recurse: traverse,
      };

      await visitor(visitorOptions, pick(['remove', 'set'], transformUtils));

      const value = utils.get(key, out);

      const createContext = (): Context => ({
        key,
        value,
        attribute,
        schema,
        path: newPath,
        data: out,
        visitor,
      });

      // ignore
      const ignoreCtx = createContext();
      const shouldIgnore = state.ignore.some((predicate) => predicate(ignoreCtx));

      if (shouldIgnore) {
        continue;
      }

      // handlers
      const handlers = [...state.handlers.common, ...state.handlers.attributes];

      for await (const handler of handlers) {
        const ctx = createContext();
        const pass = await handler.predicate(ctx);

        if (pass) {
          await handler.handler(ctx, pick(['recurse', 'set'], transformUtils));
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
