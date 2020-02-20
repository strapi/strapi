import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataToDelete: [],
  _q: '',
  _page: 1,
  _limit: 10,
  _sort: '',
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ON_QUERY_CHANGE':
      return state.update(action.key, () => action.value);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
