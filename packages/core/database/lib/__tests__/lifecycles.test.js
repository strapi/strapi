'use strict';

const { createLifecyclesProvider } = require('../lifecycles');

describe('LifecycleProvider', () => {
  describe('run', () => {
    /** @type {import("../lifecycles").LifecycleProvider} */
    let provider;
    const dbMetadataGetStub = jest.fn(uid => ({ uid, name: 'TestModel' }));

    beforeEach(() => {
      const db = {
        metadata: {
          get: dbMetadataGetStub,
        },
      };
      provider = createLifecyclesProvider(db);
      provider.clear();
    });

    it('store state', async () => {
      const expectedState = new Date().toISOString();

      const subscriber = {
        async beforeEvent(event) {
          event.state = expectedState;
        },
      };
      provider.subscribe(subscriber);

      const stateBefore = await provider.run('beforeEvent', 'test-model', { id: 'instance-id' });

      expect(stateBefore.get(subscriber)).toEqual(expectedState);
    });

    it('use shared state', async () => {
      const expectedState = { value: new Date().toISOString() };
      let receivedState;

      provider.subscribe({
        async beforeEvent(event) {
          event.state.value = expectedState.value;
        },
        async afterEvent(event) {
          receivedState = event.state;
        },
      });

      const stateBefore = await provider.run('beforeEvent', 'test-model', { id: 'instance-id' });
      await provider.run('afterEvent', 'test-model', { id: 'instance-id' }, stateBefore);

      expect(receivedState).toEqual(expectedState);
    });
  });
});
