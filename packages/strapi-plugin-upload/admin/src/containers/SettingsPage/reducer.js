import { fromJS } from 'immutable';

const initialState = fromJS({
  isLoading: true,
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
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'CANCEL_CHANGES':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('isLoading', () => false)
        .update('initialData', () => fromJS(action.data))
        .update('modifiedData', () => fromJS(action.data));
    case 'ON_CHANGE':
      return state.updateIn(['modifiedData', ...action.keys.split('.')], () => action.value);
    case 'SUBMIT_SUCCEEDED':
      return state.update('initialData', () => state.get('modifiedData'));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
