import produce from 'immer';
import reducer from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | EditView | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      isDraggingComponent: false,
    };
  });

  describe('DEFAULT_ACTION', () => {
    it('should return the state', () => {
      const expected = state;

      expect(reducer(state, {})).toEqual(expected);
    });
  });

  describe('SET_IS_DRAGGING_COMPONENT', () => {
    it('should set the isDraggingComponent to true', () => {
      const action = {
        type: 'SET_IS_DRAGGING_COMPONENT',
      };

      const expected = produce(state, draft => {
        draft.isDraggingComponent = true;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('UNSET_IS_DRAGGING_COMPONENT', () => {
    it('should set the isDraggingComponent to false', () => {
      state.isDraggingComponent = true;

      const action = {
        type: 'UNSET_IS_DRAGGING_COMPONENT',
      };

      const expected = produce(state, draft => {
        draft.isDraggingComponent = false;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
