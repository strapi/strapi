import produce from 'immer';

const initialState = {
  formattedContentTypeLayout: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, drafState => {
    switch (action.type) {
      case 'SET_LAYOUT_DATA': {
        drafState.formattedContentTypeLayout = action.formattedContentTypeLayout;
        break;
      }
      case 'RESET_PROPS':
        return initialState;

      default: {
        return drafState;
      }
    }
  });

export default reducer;
export { initialState };
