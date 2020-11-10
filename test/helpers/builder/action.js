'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { prop, isArray, curry, isNil, has } = require('lodash/fp');
const modelsUtils = require('../models');

const bindEvent = ({ event, fn, batch = false, metadata = {} } = {}) => {
  Object.assign(fn, {
    emitInfos: {
      event,
      batch,
      metadata,
    },
  });

  return fn;
}


const registry = {
  ct: {
    create: bindEvent({ event: 'model.created', metadata: { type: 'ct' }, fn: modelsUtils.createContentType }),
    createBatch: bindEvent({ event: 'model.created', metadata: { type: 'ct' }, fn: modelsUtils.createContentTypes, batch: true }),
    createMany: bindEvent({ event: 'model.created', metadata: { type: 'ct' }, fn: async cts => {
      const createdModels = [];

      for (const ct of cts) {
        createdModels.push(await modelsUtils.createContentType(ct));
      }

      return createdModels;
    }}),
  },
  comp: {
    create: bindEvent({ event: 'model.created', metadata: { type: 'comp' }, fn: modelsUtils.createComponent }),
  },
  fixture: {
    create: bindEvent({ event: 'fixture.created', batch: true, fn: async (model, entries) => {
      const result = await modelsUtils.createFixturesFor(model, entries);
      return { entries: result, model };
    }}),
  }
};

const getActionByCode = code => prop(code, registry);

const createAction = (code, ...params) => {
  const _state = {
    emitter: null,
    params,
    code,
    fn: getActionByCode(code),
  };

  return {
    get params() {
      return _state.params;
    },

    get code() {
      return _state.code;
    },

    get fn() {
      return _state.fn;
    },

    setEmitter(emitter) {
      _state.emitter = emitter;
      return this;
    },

    async execute() {
      const { fn, params, emitter } = _state;

      const res = await fn(...params);

      if (isNil(emitter) || !has('emitInfos', fn)) {
        return res;
      }

      const { event, batch, metadata } = fn.emitInfos;

      const emitEvent = curry(emitter.emit)(event);
      const bindMetadata = result => ({ result, metadata });

      if (isArray(res) && !batch) {
        res.map(bindMetadata).forEach(emitEvent)
      } else {
        emitEvent(bindMetadata(res));
      }

      return res;
    },
  };
};

module.exports = {
  createAction,
}
