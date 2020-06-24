import { fromJS } from 'immutable';

const initialState = fromJS({
  initialData: {},
  modifiedData: {},
  shouldRefetchData: true,
  shouldSaveData: false,
  editMode: false,
});

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('modifiedData', () => fromJS(action.data))
        .update('shouldRefetchData', () => false);
    case 'RESET_ITEMS':
      return state
        .update('editMode', () => false)
        .updateIn(['modifiedData', 'menuItems'], () => state.getIn(['initialData', 'menuItems']));
    case 'REFETCH_DATA':
      // refetch menuItems from database
      return state.update('shouldRefetchData', () => true);
    case 'ADD_ITEM':
      // add new item to menuItems list
      return state.updateIn(['modifiedData', 'menuItems'], menuItems =>
        menuItems.push(fromJS(action.value))
      );
    case 'REMOVE_ITEM':
      // remove item from list of menuItems
      break;
    case 'MOVE_ITEM':
      // return updated list
      return state.updateIn(['modifiedData', 'menuItems'], () => fromJS(action.value));
    case 'SAVE_ITEMS':
      // save menuItems to database and wait for response

      // refetch menuItems from database

      // return menuItems
      return state.update('editMode', () => false).update('shouldSaveData', () => true);
    case 'SAVE_ITEMS_SUCCEEDED':
      return state.update('shouldSaveData', () => false).update('shouldRefetchData', () => true);
    case 'SET_EDIT_MODE':
      return state.update('editMode', () => fromJS(action.value));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
