import { createLifecyclesProvider, LifecycleProvider, Event, Subscriber } from '../lifecycles';
import type { Database } from '..';

describe('LifecycleProvider', () => {
  describe('run', () => {
    let provider: LifecycleProvider;
    const dbMetadataGetStub = jest.fn((uid) => ({ uid, name: 'TestModel' }));

    beforeEach(() => {
      const db = {
        metadata: {
          get: dbMetadataGetStub,
        },
      } as any as Database;

      provider = createLifecyclesProvider(db);
      provider.clear();
    });

    it('store state', async () => {
      const expectedState = { date: new Date().toISOString() };
      const subscriber: Subscriber = {
        async beforeCreate(event: Event) {
          event.state = expectedState;
        },
      };

      provider.subscribe(subscriber);

      const stateBefore = await provider.run('beforeCreate', 'test-model', {
        params: {},
      });

      expect(stateBefore.get(subscriber)).toEqual(expectedState);
    });

    it('use shared state', async () => {
      const expectedState = { value: new Date().toISOString() };
      let receivedState;

      provider.subscribe({
        async beforeCreate(event) {
          event.state.value = expectedState.value;
        },
        async afterCreate(event) {
          receivedState = event.state;
        },
      });

      const stateBefore = await provider.run('beforeCreate', 'test-model', { params: {} });
      await provider.run('afterCreate', 'test-model', { params: {} }, stateBefore);

      expect(receivedState).toEqual(expectedState);
    });
  });
});
