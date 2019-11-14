import { fromJS, OrderedMap } from 'immutable';

const initialState = fromJS({
  components: {},
  contentTypes: {},
  initialData: {},
  modifiedData: {},
  isLoading: true,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('components', () => fromJS(action.components))
        .update('contentTypes', () => fromJS(action.contentTypes))
        .update('isLoading', () => false);
    case 'SET_MODIFIED_DATA':
      return state
        .update('initialData', () => OrderedMap(action.schemaToSet))
        .update('modifiedData', () => OrderedMap(action.schemaToSet));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
