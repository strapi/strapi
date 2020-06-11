import produce from 'immer';

const initialState = {
  isLoading: true,
  allowedActions: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.allowedActions = action.data;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
