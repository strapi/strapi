import {
  fromJS,
  // List,
} from 'immutable';

const initialState = fromJS({
  isLoading: true,
  initialData: {},
  modifiedData: {},
});

const reducer = (state, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

export default reducer;
export { initialState };
