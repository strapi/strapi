import { fromJS } from 'immutable';

const initialState = fromJS({
  collapses: {},
  groupLayoutsData: {},
  initialData: {},
  isLoading: true,
  isLoadingForLayouts: true,
  modifiedData: {},
});

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_FIELD_TO_GROUP':
      return state.updateIn(['modifiedData', ...action.keys], list => {
        if (list) {
          return list.push(fromJS({}));
        }

        return fromJS([{}]);
      });
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('modifiedData', () => fromJS(action.data))
        .update('isLoading', () => false);
    case 'GET_GROUP_LAYOUTS_SUCCEEDED':
      return state
        .update('groupLayoutsData', () => fromJS(action.groupLayouts))
        .update('isLoadingForLayouts', () => false);
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'ON_REMOVE_FIELD':
      return state.removeIn(['modifiedData', ...action.keys]);
    case 'RESET_FORM':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'SET_COLLAPSES_COMPONENTS_STATE':
      return state.update('collapses', () => fromJS(action.collapses));
    default:
      return state;
  }
}

export default reducer;
export { initialState };
