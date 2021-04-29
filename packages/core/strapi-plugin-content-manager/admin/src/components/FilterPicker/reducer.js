import { fromJS } from 'immutable';

const initialState = fromJS({
  attributes: {},
  initialData: [],
  modifiedData: [],
});

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_FILTER':
      return state.update('modifiedData', list => list.push(fromJS(action.filter)));
    case 'ON_CHANGE': {
      const [index, key] = action.keys;

      return state
        .updateIn(['modifiedData', ...action.keys], () => {
          if (action.value && action.value._isAMomentObject === true) {
            return action.value.toISOString();
          }

          return action.value;
        })
        .updateIn(['modifiedData', index, 'value'], value => {
          if (key === 'name') {
            const attribute = state.getIn(['attributes', action.value]);
            const attributeType = attribute.get('type');

            if (attributeType === 'boolean') {
              return 'true';
            }

            if (attributeType === 'enumeration') {
              return attribute.getIn(['enum', '0']) || '';
            }

            return '';
          }

          return value;
        });
    }
    case 'REMOVE_FILTER':
      return state.removeIn(['modifiedData', action.index]);
    case 'RESET_FILTERS':
      return initialState;
    case 'SET_FILTERS':
      return state
        .update('attributes', () => fromJS(action.attributes))
        .update('initialData', () => fromJS(action.initialFilters))
        .update('modifiedData', () => fromJS(action.initialFilters));
    default:
      return state;
  }
}

export default reducer;
export { initialState };
