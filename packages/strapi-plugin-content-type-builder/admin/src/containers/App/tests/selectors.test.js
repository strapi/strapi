import { fromJS } from 'immutable';
import pluginId from '../../../pluginId';
import makeSelectApp, { makeSelectConnections, selectAppDomain } from '../selectors';

const state = fromJS({
  connections: ['default'],
  initialData: {},
  models: [],
  modifiedData: {},
});

describe('CTB, <App /> selectors', () => {
  describe('selectAppDomain', () => {
    it('should select the global state', () => {
      const mockedState = fromJS({
        [`${pluginId}_app`]: state,
      });

      expect(selectAppDomain()(mockedState)).toEqual(state);
    });
  });

  describe('makeSelectApp', () => {
    it('should select the global state', () => {
      const mockedState = fromJS({
        [`${pluginId}_app`]: state,
      });

      expect(makeSelectApp()(mockedState)).toEqual(state.toJS());
    });
  });

  describe('makeSelectConnections', () => {
    it('should select the global state', () => {
      const mockedState = fromJS({
        [`${pluginId}_app`]: state,
      });

      expect(makeSelectConnections()(mockedState)).toEqual(['default']);
    });
  });
});
