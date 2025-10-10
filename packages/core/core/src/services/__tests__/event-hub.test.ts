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
