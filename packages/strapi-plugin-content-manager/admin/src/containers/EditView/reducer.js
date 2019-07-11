import { fromJS } from 'immutable';

const initialState = fromJS({
  initialData: {},
  isLoading: true,
  modifiedData: {},
  isSubmitting: false,
});

function reducer(state, action) {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('isLoading', () => false)
        .update('initialData', () => fromJS(action.data))
        .update('modifiedData', () => fromJS(action.data));
    default:
      return state;
  }
}

export default reducer;
export { initialState };
