import { fromJS } from 'immutable';

const initialState = fromJS({
  formattedContentTypeLayout: [],
  isDraggingComponent: false,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_IS_DRAGGING_COMPONENT':
      return state.update('isDraggingComponent', () => true);
    case 'SET_LAYOUT_DATA':
      return state.update('formattedContentTypeLayout', () =>
        fromJS(action.formattedContentTypeLayout)
      );
    case 'RESET_PROPS':
      return initialState;
    case 'UNSET_IS_DRAGGING_COMPONENT':
      return state.update('isDraggingComponent', () => false);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
