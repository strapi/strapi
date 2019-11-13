import { fromJS } from 'immutable';

const initialState = fromJS({
  components: {},
  contentTypes: {},
  isLoading: true,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('components', () => fromJS(action.components))
        .update('contentTypes', () => fromJS(action.contentTypes))
        .update('isLoading', () => false);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
