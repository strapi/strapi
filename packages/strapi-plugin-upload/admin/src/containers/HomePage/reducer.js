import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataToDelete: [],
  // TODO: set to empty string
  _q: 'super asset',
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ON_CLEAR_SEARCH':
      return state.update('_q', () => '');
    default:
      return state;
  }
};

export default reducer;
export { initialState };
