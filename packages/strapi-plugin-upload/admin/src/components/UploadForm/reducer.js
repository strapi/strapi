import { fromJS } from 'immutable';

const initialState = fromJS({
  to: 'computer',
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_TAB':
      return state.update('to', () => action.to);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
