import type { Subscriber } from '../types';

/**
 * For each model try to run it's lifecycles function if any is defined
 */
export const modelsLifecyclesSubscriber: Subscriber = async (event) => {
  const { model } = event;

  if (model.lifecycles && event.action in model.lifecycles) {
    await model.lifecycles[event.action]?.(event);
  }
};
