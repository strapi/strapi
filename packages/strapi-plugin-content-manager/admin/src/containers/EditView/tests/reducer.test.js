import produce from 'immer';
import reducer from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | EditView | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      formattedContentTypeLayout: [],
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

  describe('SET_LAYOUT_DATA', () => {
    it('should set the isDraggingComponent to true', () => {
      const action = {
        type: 'SET_LAYOUT_DATA',
        formattedContentTypeLayout: ['test', 'test1'],
      };

      const expected = produce(state, draft => {
        draft.formattedContentTypeLayout = ['test', 'test1'];
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_PROPS', () => {
    it('should set the isDraggingComponent to true', () => {
      const action = {
        type: 'RESET_PROPS',
      };

      state.isDraggingComponent = true;
      state.formattedContentTypeLayout = ['test', 'test1'];

      const expected = produce(state, draft => {
        draft.isDraggingComponent = false;
        draft.formattedContentTypeLayout = [];
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
