export default async function reducer(state = null, action) {
  switch (action.type) {
    case 'REFETCH_ITEMS':
      //refetch menuItems from database
    case 'ADD_ITEM':
      //add new item to menuItems list
    case 'REMOVE_ITEM':
      //remove item from list of menuItems
    case 'MOVE_ITEM':
      // return updated list
      return action.value
    case 'SAVE_ITEMS':
      // save menuItems to database and wait for response

      // refetch menuItems from database

      // return menuItems
    default:
      return state;
  }
}
