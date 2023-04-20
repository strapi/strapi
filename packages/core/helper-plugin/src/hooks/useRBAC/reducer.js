import produce from 'immer';
import generateAllowedActions from './utils/generateAllowedActions';

const initialState = {
  isLoading: true,
  allowedActions: {},
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.allowedActions = generateAllowedActions(action.permissionNames);
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.allowedActions = action.data;
        break;
      }
      case 'SET_IS_LOADING': {
        draftState.isLoading = true;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
