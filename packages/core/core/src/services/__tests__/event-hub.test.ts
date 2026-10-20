import createEventHub from '../event-hub';

describe('Event Hub', () => {
  it('only triggers the callback once with once()', async () => {
    const { once, emit } = createEventHub();

    const fn = jest.fn();

    const args = [1, 2, 3];
    once('my-event', fn);

    await emit('my-event', ...args);
    await emit('my-event');
    await emit('my-event');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(...args);
  });

  it('subscribes and unsubscribes to all events', async () => {
    const { subscribe, unsubscribe, emit } = createEventHub();

    const fn = jest.fn();
    subscribe(fn);

    const args1 = [1, 2, 3];
    const args2 = [4, 5, 6];

    await emit('my-event', ...args1);
    await emit('my-event', ...args2);
    await emit('my-other-event');

    expect(fn).toHaveBeenCalled();
    expect(fn).toHaveBeenNthCalledWith(1, 'my-event', ...args1);
    expect(fn).toHaveBeenNthCalledWith(2, 'my-event', ...args2);
    expect(fn).toHaveBeenNthCalledWith(3, 'my-other-event');

    // Unsubscribes with unsubscribe()
    unsubscribe(fn);
    await emit('my-event');
    expect(fn).toHaveBeenCalledTimes(3);

    // Unsubscribes with the returned function
    const unsubscribe2 = subscribe(fn);
    await emit('my-event');
    expect(fn).toHaveBeenCalledTimes(4);
    unsubscribe2();
    await emit('my-event');
    expect(fn).toHaveBeenCalledTimes(4);

    // Avoid removing the wrong subscriber when unsubscribe is given a non-existing subscriber
    const unsubscribe3 = subscribe(fn);
    const unrelatedFunction = jest.fn();
    unsubscribe(unrelatedFunction);
    await emit('my-event');
    expect(fn).toHaveBeenCalledTimes(5);
    unsubscribe3();
  });

  it('adds and removes simple listeners', async () => {
    const { on, off, emit } = createEventHub();

    const fn = jest.fn();
    const args = [1, 2, 3];

    // Listens to event with on()
    on('my-event', fn);
    await emit('my-event', ...args);
    expect(fn).toHaveBeenCalledWith(...args);

    // Removes listener with off()
    off('my-event', fn);
    await emit('my-event');
    expect(fn).toHaveBeenCalledTimes(1);

    // Removes listener with the returned function
    const off2 = on('my-event', fn);
    await emit('my-event', ...args);
    expect(fn).toHaveBeenCalledTimes(2);
    off2();
    await emit('my-event');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not remove other listeners when off() is given a listener that is not registered', async () => {
    const { on, off, emit } = createEventHub();

    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const unregistered = jest.fn();

    on('my-event', fn1);
    on('my-event', fn2);

    off('my-event', unregistered);
    await emit('my-event');

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(unregistered).not.toHaveBeenCalled();
  });

  it('removes only the once() listener after its first call when other listeners exist', async () => {
    const { on, once, emit } = createEventHub();

    const before = jest.fn();
    const onceFn = jest.fn();
    const after = jest.fn();

    on('my-event', before);
    once('my-event', onceFn);
    on('my-event', after);

    await emit('my-event');
    await emit('my-event');

    expect(onceFn).toHaveBeenCalledTimes(1);
    expect(before).toHaveBeenCalledTimes(2);
    expect(after).toHaveBeenCalledTimes(2);
  });

  it('calls a once() listener one time when another emit starts while an earlier listener is awaiting', async () => {
    const { on, once, emit } = createEventHub();

    let release: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onceFn = jest.fn();

    on('my-event', async () => {
      await gate;
    });
    once('my-event', onceFn);

    const first = emit('my-event');
    await Promise.resolve();
    const second = emit('my-event');
    release!();
    await Promise.all([first, second]);

    expect(onceFn).toHaveBeenCalledTimes(1);
  });

  it('removes only the once() listener with the function that once() returns', async () => {
    const { on, once, emit } = createEventHub();

    const onceFn = jest.fn();
    const other = jest.fn();

    const removeOnce = once('my-event', onceFn);
    on('my-event', other);

    removeOnce();
    await emit('my-event');

    expect(onceFn).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('removes all subscribers on destroy()', async () => {
    const eventHub = createEventHub();

    const fn = jest.fn();
    const fn2 = jest.fn();
    eventHub.subscribe(fn);
    eventHub.on('my-event', fn2);

    await eventHub.emit('my-event');
    expect(fn).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();

    eventHub.destroy();

    // Subscribers are removed
    await eventHub.emit('my-event');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('removes all subscribers on removeAllSubscribers()', async () => {
    const eventHub = createEventHub();

    const fn = jest.fn();
    eventHub.subscribe(fn);

    await eventHub.emit('my-event');
    expect(fn).toHaveBeenCalled();

    eventHub.removeAllSubscribers();

    // Subscribers are removed
    await eventHub.emit('my-event');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Event Hub hasListeners', () => {
  it('is false when nothing can receive the event', () => {
    const { hasListeners } = createEventHub();

    expect(hasListeners('my-event')).toBe(false);
  });

  it('is true while a listener is registered for the event', () => {
    const { on, off, hasListeners } = createEventHub();
    const listener = jest.fn();

    const removeListener = on('my-event', listener);
    expect(hasListeners('my-event')).toBe(true);
    expect(hasListeners('my-other-event')).toBe(false);

    removeListener();
    expect(hasListeners('my-event')).toBe(false);

    on('my-event', listener);
    off('my-event', listener);
    expect(hasListeners('my-event')).toBe(false);
  });

  it('is true for every event while a subscriber is registered', () => {
    const { subscribe, hasListeners } = createEventHub();

    const unsubscribe = subscribe(jest.fn());
    expect(hasListeners('my-event')).toBe(true);
    expect(hasListeners('my-other-event')).toBe(true);

    unsubscribe();
    expect(hasListeners('my-event')).toBe(false);
  });

  it('is false after destroy()', () => {
    const eventHub = createEventHub();
    eventHub.on('my-event', jest.fn());
    eventHub.subscribe(jest.fn());

    eventHub.destroy();

    expect(eventHub.hasListeners('my-event')).toBe(false);
  });
});
