import type { Subscriber } from '../types';

export const isValidSubscriber = (subscriber: Subscriber) => {
  return (
    typeof subscriber === 'function' || (typeof subscriber === 'object' && subscriber !== null)
  );
};

export { modelsLifecyclesSubscriber } from './models-lifecycles';
export { timestampsLifecyclesSubscriber } from './timestamps';
