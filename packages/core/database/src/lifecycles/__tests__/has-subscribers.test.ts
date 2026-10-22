import { createLifecyclesProvider } from '..';

const createDb = (lifecycles?: Record<string, unknown>) =>
  ({
    metadata: {
      get: jest.fn(() => ({ uid: 'api::article.article', lifecycles })),
    },
  }) as any;

describe('lifecycles provider hasSubscribers', () => {
  it('is false when only the default subscribers are registered and the model has no lifecycle', () => {
    const lifecycles = createLifecyclesProvider(createDb());

    expect(lifecycles.hasSubscribers('beforeDelete', 'api::article.article')).toBe(false);
    // the timestamps subscriber only stamps the data of a write: it does not count
    expect(lifecycles.hasSubscribers('beforeCreate', 'api::article.article')).toBe(false);
    expect(lifecycles.hasSubscribers('beforeUpdate', 'api::article.article')).toBe(false);
  });

  it('is true when the model declares the lifecycle', () => {
    const lifecycles = createLifecyclesProvider(createDb({ beforeDelete: jest.fn() }));

    expect(lifecycles.hasSubscribers('beforeDelete', 'api::article.article')).toBe(true);
    expect(lifecycles.hasSubscribers('afterDelete', 'api::article.article')).toBe(false);
  });

  it('follows the subscribers registered for the model, for every model, or as a function', () => {
    const lifecycles = createLifecyclesProvider(createDb());

    const unsubscribeOther = lifecycles.subscribe({
      models: ['api::other.other'],
      afterDelete: jest.fn(),
    });
    expect(lifecycles.hasSubscribers('afterDelete', 'api::article.article')).toBe(false);
    unsubscribeOther();

    const unsubscribeModel = lifecycles.subscribe({
      models: ['api::article.article'],
      afterDelete: jest.fn(),
    });
    expect(lifecycles.hasSubscribers('afterDelete', 'api::article.article')).toBe(true);
    expect(lifecycles.hasSubscribers('beforeDelete', 'api::article.article')).toBe(false);
    unsubscribeModel();

    const unsubscribeAll = lifecycles.subscribe({ afterDelete: jest.fn() });
    expect(lifecycles.hasSubscribers('afterDelete', 'api::article.article')).toBe(true);
    unsubscribeAll();

    const unsubscribeFn = lifecycles.subscribe(jest.fn());
    expect(lifecycles.hasSubscribers('afterDelete', 'api::article.article')).toBe(true);
    unsubscribeFn();

    expect(lifecycles.hasSubscribers('afterDelete', 'api::article.article')).toBe(false);
  });

  it('is false while the lifecycles are disabled', () => {
    const lifecycles = createLifecyclesProvider(createDb());
    lifecycles.subscribe({ beforeDelete: jest.fn() });

    lifecycles.disable();
    expect(lifecycles.hasSubscribers('beforeDelete', 'api::article.article')).toBe(false);

    lifecycles.enable();
    expect(lifecycles.hasSubscribers('beforeDelete', 'api::article.article')).toBe(true);
  });
});
