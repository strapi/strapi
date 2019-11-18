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
    case 'CREATE_SCHEMA': {
      const newSchema = {
        uid: action.uid,
        isTemporary: true,
        schema: {
          ...action.data,
          attributes: {},
        },
      };
      const key =
        action.schemaType === 'contentType' ? 'contentTypes' : 'components';

      return state.updateIn([key, action.uid], () => fromJS(newSchema));
    }

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
