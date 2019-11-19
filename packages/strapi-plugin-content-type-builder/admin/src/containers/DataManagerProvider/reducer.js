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
    case 'ADD_ATTRIBUTE': {
      const {
        attributeToSet: { name, ...rest },
      } = action;

      return state.updateIn(
        ['modifiedData', 'schema', 'attributes', name],
        () => fromJS(rest)
      );
    }
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

    case 'SET_MODIFIED_DATA': {
      const schemaWithOrderedAttributes = fromJS(action.schemaToSet).setIn(
        ['schema', 'attributes'],
        OrderedMap(action.schemaToSet.schema.attributes)
      );

      return state
        .update('initialData', () => schemaWithOrderedAttributes)
        .update('modifiedData', () => schemaWithOrderedAttributes);
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
