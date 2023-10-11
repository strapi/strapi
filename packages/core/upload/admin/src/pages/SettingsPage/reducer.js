import produce from 'immer';
import set from 'lodash/set';

const initialState = {
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
  produce(state, (drafState) => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        drafState.initialData = action.data;
        drafState.modifiedData = action.data;
        break;
      }
      case 'ON_CHANGE': {
        set(drafState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
