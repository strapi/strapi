'use strict';

const createEventHub = require('../event-hub');

test('Subscribe once will trigger the callback only once', async () => {
  const { once, emit } = createEventHub();

  const fn = jest.fn();

  const args = [1, 2, 3];
  once('my-event', fn);

  emit('my-event', ...args);
  emit('my-event');
  emit('my-event');

  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(...args);
});
