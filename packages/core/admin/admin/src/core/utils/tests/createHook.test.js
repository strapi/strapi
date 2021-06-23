import createHook from '../createHook';

describe('ADMIN | core | utils | createHook', () => {
  let hooksContainer;

  beforeEach(() => {
    hooksContainer = createHook();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls all of the mocks sequentially', () => {
    hooksContainer.register(() => 1);
    hooksContainer.register(() => 2);
    hooksContainer.register(() => 3);

    const [a, b, c] = hooksContainer.runSeries();

    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });

  it('calls all of the mocks sequentially when they resolve async code', async () => {
    hooksContainer.register(() => Promise.resolve(1));
    hooksContainer.register(() => Promise.resolve(2));
    hooksContainer.register(() => Promise.resolve(3));

    const [a, b, c] = await hooksContainer.runSeriesAsync();

    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });

  it('calls all of the mocks in a waterfall fashion', () => {
    hooksContainer.register(n => n + 1);
    hooksContainer.register(n => n + 2);
    hooksContainer.register(n => n * 3);

    const res = hooksContainer.runWaterfall(1);

    expect(res).toBe(12);
  });

  it('calls all of the mocks in a waterfall fashion when they resolve async code', async () => {
    hooksContainer.register(n => Promise.resolve(n + 1));
    hooksContainer.register(n => n + 2);
    hooksContainer.register(n => Promise.resolve(n * 3));

    const res = await hooksContainer.runWaterfallAsync(1);

    expect(res).toBe(12);
  });

  it('calls all of the mocks in parallel', async () => {
    hooksContainer.register(() => Promise.resolve(1));
    hooksContainer.register(() => Promise.resolve(2));
    hooksContainer.register(() => Promise.resolve(3));

    const [a, b, c] = await hooksContainer.runParallel();

    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });

  it('removes a hook when calling delete', () => {
    const fn1 = () => 1;
    const fn2 = () => 2;
    const fn3 = () => 3;

    hooksContainer.register(fn1);
    hooksContainer.register(fn2);
    hooksContainer.register(fn3);

    hooksContainer.delete(fn3);

    const [a, b, c] = hooksContainer.runSeries();

    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(undefined);
  });
});
