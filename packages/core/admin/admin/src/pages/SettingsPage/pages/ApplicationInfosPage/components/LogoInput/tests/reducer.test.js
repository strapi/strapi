import reducer, { initialState } from '../reducer';

describe('ApplicationsInfosPage | LogoModalStepper | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return initialState', () => {
      const state = { ...initialState };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('GO_TO', () => {
    it('should update current step', () => {
      const state = { ...initialState };

      const action = {
        type: 'GO_TO',
        to: 'pending',
      };

      const expected = { ...initialState, currentStep: action.to };
      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
