import produce from 'immer';

const initialState = {
  formattedContentTypeLayout: [],
  isDraggingComponent: false,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, drafState => {
    switch (action.type) {
      case 'SET_IS_DRAGGING_COMPONENT': {
        drafState.isDraggingComponent = true;
        break;
      }

      case 'SET_LAYOUT_DATA': {
        drafState.formattedContentTypeLayout = action.formattedContentTypeLayout;
        break;
      }
      case 'RESET_PROPS':
        return initialState;
      case 'UNSET_IS_DRAGGING_COMPONENT': {
        drafState.isDraggingComponent = false;
        break;
      }
      default: {
        return drafState;
      }
    }
  });

export default reducer;
export { initialState };
