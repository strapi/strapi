import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataToDelete: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

export default reducer;
export { initialState };
