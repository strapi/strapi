import produce from 'immer';
import set from 'lodash/set';

const initialState = {
  isLoading: true,
  isSubmiting: false,
  initialData: {
    responsiveDimensions: true,
    sizeOptimization: true,
    autoOrientation: false,
    videoPreview: false,
  },
  modifiedData: {
    responsiveDimensions: true,
    sizeOptimization: true,
    autoOrientation: false,
    videoPreview: false,
  },
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, drafState => {
    switch (action.type) {
      case 'CANCEL_CHANGES': {
        drafState.modifiedData = state.initialData;
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        drafState.isLoading = false;
        drafState.initialData = action.data;
        drafState.modifiedData = action.data;
        break;
      }
      case 'ON_CHANGE': {
        set(drafState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      case 'ON_SUBMIT': {
        drafState.isSubmiting = true;
        break;
      }
      case 'SUBMIT_SUCCEEDED': {
        drafState.initialData = state.modifiedData;
        drafState.isSubmiting = false;
        break;
      }
      case 'ON_SUBMIT_ERROR': {
        drafState.isSubmiting = false;
        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
