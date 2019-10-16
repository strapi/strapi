import { fromJS } from 'immutable';

const initialState = fromJS({
  initialData: {},
  isLoading: true,
  modifiedData: {},
});

const reducer = (state, action) => {
  const layoutPath = ['modifiedData', 'layouts', 'list'];
  switch (action.type) {
    case 'ADD_FIELD':
      return state.updateIn(layoutPath, list => list.push(action.item));
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.data));
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys.split('.')],
        () => action.value
      );
    case 'ON_RESET':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'REMOVE_FIELD': {
      const defaultSortByPath = ['modifiedData', 'settings', 'defaultSortBy'];
      const defaultSortBy = state.getIn(defaultSortByPath);
      const attrPath = ['modifiedData', 'layouts', 'list', action.index];
      const attrToBeRemoved = state.getIn(attrPath);

      console.log(attrToBeRemoved, defaultSortBy);

      const firstAttr = state.getIn(['modifiedData', 'layouts', 'list', 1]);
      const firstAttrType = state.getIn([
        'modifiedData',
        'schema',
        'attributes',
        firstAttr,
        'type',
      ]);
      const attrToSelect = firstAttrType !== 'media' ? firstAttr : 'id';

      return state
        .removeIn(['modifiedData', 'layouts', 'list', action.index])
        .updateIn(defaultSortByPath, () => {
          if (attrToBeRemoved === defaultSortBy) {
            return attrToSelect;
          }

          return defaultSortBy;
        });
    }
    case 'SUBMIT_SUCCEEDED':
      return state.update('initialData', () => state.get('modifiedData'));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
