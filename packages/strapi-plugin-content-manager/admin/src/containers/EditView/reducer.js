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
          const max = Math.max.apply(
            Math,
            list.toJS().map(function(o) {
              return o._temp__id;
            })
          );

          return list.push(fromJS({ _temp__id: max + 1 }));
        }
        return fromJS([{ _temp__id: 0 }]);
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
    case 'MOVE_GROUP_FIELD':
      return state.updateIn(['modifiedData', ...action.keys], list => {
        return list
          .delete(action.dragIndex)
          .insert(action.overIndex, list.get(action.dragIndex));
      });
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
