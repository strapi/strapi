'use strict';

/**
 * @typedef {import(".").Subscriber } Subscriber
 */

/**
 * For each model try to run it's lifecycles function if any is defined
 * @type {Subscriber}
 */
const modelsLifecyclesSubscriber = async event => {
  const { model } = event;

  if (event.action in model.lifecycles) {
    await model.lifecycles[event.action](event);
  }
};

module.exports = modelsLifecyclesSubscriber;
