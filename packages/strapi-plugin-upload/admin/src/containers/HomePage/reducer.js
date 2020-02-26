import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataToDelete: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('data', () => action.data);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
