import { fromJS, OrderedMap } from 'immutable';
import { get } from 'lodash';
const initialState = fromJS({
  components: {},
  contentTypes: {},
  initialData: {},
  modifiedData: {},
  isLoading: true,
  isLoadingForDataToBeSet: true,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ATTRIBUTE': {
      const {
        attributeToSet: { name, ...rest },
      } = action;

      return state
        .updateIn(['modifiedData', 'schema', 'attributes', name], () => {
          return fromJS(rest);
        })
        .updateIn(['modifiedData', 'schema', 'attributes'], obj => {
          const type = get(rest, 'type');
          const target = get(rest, 'target', null);
          const nature = get(rest, 'nature', null);
          const currentUid = state.getIn(['modifiedData', 'uid']);

          // When the user in creating a relation with the same content type we need to create another attribute
          // that is the opposite of the created one
          if (
            type === 'relation' &&
            nature !== 'oneWay' &&
            nature !== 'manyWay' &&
            target === currentUid
          ) {
            const oppositeAttribute = {
              nature,
              target,
              type,
              unique: rest.unique,
              required: rest.required,
              dominant: nature === 'manyToMany' ? !rest.dominant : null,
              targetAttribute: name,
            };

            return obj.update(rest.targetAttribute, () => {
              return fromJS(oppositeAttribute);
            });
          }

          return obj;
        });
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
        OrderedMap(get(action, 'schemaToSet.schema.attributes', {}))
      );

      return state
        .update('isLoadingForDataToBeSet', () => false)
        .update('initialData', () => schemaWithOrderedAttributes)
        .update('modifiedData', () => schemaWithOrderedAttributes);
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
