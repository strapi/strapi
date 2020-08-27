import reducer from '../reducer';

describe('ADMIN | COMPONENTS | USERSPERMISSIONS | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SELECT_ACTION', () => {
    it('should set the selected action correctly if this one doesnt exist', () => {
      const action = {
        type: 'SELECT_ACTION',
        actionToSelect: 'application.controllers.address.delete',
      };
      const initialState = {
        modifiedData: {},
        routes: {},
        selectedAction: '',
      };

      const expected = {
        modifiedData: {},
        routes: {},
        selectedAction: 'application.controllers.address.delete',
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should empty the selected action if the action to select already exist', () => {
      const action = {
        type: 'SELECT_ACTION',
        actionToSelect: 'application.controllers.address.delete',
      };
      const initialState = {
        modifiedData: {},
        routes: {},
        selectedAction: 'application.controllers.address.delete',
      };

      const expected = {
        modifiedData: {},
        routes: {},
        selectedAction: '',
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
