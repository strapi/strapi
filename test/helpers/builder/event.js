'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { contains, reduce, over } = require('lodash/fp');

const createEvent = (eventName, data) => ({ name: eventName, data, emittedAt: new Date() });

const createEventsManager = ({ allowedEvents = [] }) => {
  const toEventsMap = reduce((acc, eventName) => ({ ...acc, [eventName]: [] }), {});

  const _state = {
    events: toEventsMap(allowedEvents),
    callbacks: toEventsMap(allowedEvents),
    allowedEvents,
  };

  const pushEvent = event => _state.events[event.name].push(event.data);
  const notify = ({ name, data }) => over(_state.callbacks[name])(data);
  const validateEventName = eventName => {
    if (!contains(eventName, _state.allowedEvents)) {
      throw new Error(`"${eventName}" is not a valid event name.`);
    }
  }

  return {
    get eventsMap() {
      return _state.events;
    },

    get allowedEvents() {
      return _state.allowedEvents;
    },

    getEventsByName(name) {
      validateEventName(name);

      return _state.events[name];
    },

    register(eventName, callback) {
      validateEventName(eventName);

      _state.callbacks[eventName].push(callback);

      return this;
    },

    unregister(eventName, callback) {
      validateEventName(eventName);

      _state.callbacks[eventName] = _state.callbacks[eventName].filter(cb => cb !== callback);

      return this;
    },

    emit(eventName, data) {
      validateEventName(eventName);

      const event = createEvent(eventName, data);
      const executeOperations = over([pushEvent, notify]);

      executeOperations(event);

      return this;
    }
  }
}

module.exports = {
  createEvent,
  createEventsManager,
};
