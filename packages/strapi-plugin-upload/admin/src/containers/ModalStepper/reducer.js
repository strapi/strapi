import { fromJS } from 'immutable';

const initialState = fromJS({
  currentStep: 'browse',
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'RESET_PROPS':
      return initialState;
    default:
      return state;
  }
};

export default reducer;
export { initialState };
