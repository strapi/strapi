import produce from 'immer';

const initialState = {
  isLoading: true,
  modifiedData: {},
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.modifiedData = {};

        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.modifiedData = action.data;

        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = true;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.modifiedData = action.data;

        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
