'use strict';

const { isNil, pick } = require('lodash/fp');

module.exports = () => {
  const state = {
    parsers: [],
    interceptors: [],
    ignore: [],
    handlers: {
      attributes: [],
      common: [],
    },
  };

  const traverse = async (visitor, options, data) => {
    const { path = { raw: null, attribute: null }, schema } = options ?? {};

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

      const visitorOptions = {
        key,
        value: utils.get(key, out),
        attribute,
        schema,
        path: newPath,
        data: out,
      };

      const transformUtils = {
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

      const createContext = () => ({
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

    intercept(predicate, handler) {
      state.interceptors.push({ predicate, handler });
      return this;
    },

    parse(predicate, parser) {
      state.parsers.push({ predicate, parser });
      return this;
    },

    ignore(predicate) {
      state.ignore.push(predicate);
      return this;
    },

    on(predicate, handler) {
      state.handlers.common.push({ predicate, handler });
      return this;
    },

    onAttribute(predicate, handler) {
      state.handlers.attributes.push({ predicate, handler });
      return this;
    },

    onRelation(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'relation', handler);
    },

    onMedia(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'media', handler);
    },

    onComponent(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'component', handler);
    },

    onDynamicZone(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === 'dynamiczone', handler);
    },
  };
};
