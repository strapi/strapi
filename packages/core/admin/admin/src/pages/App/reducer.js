import produce from 'immer';
import { SET_APP_RUNTIME_STATUS } from './constants';

const initialState = {
  status: 'init',
};

const reducer = (state = initialState, action) =>
  /* eslint-disable-next-line consistent-return */
  produce(state, (draftState) => {
    switch (action.type) {
      case SET_APP_RUNTIME_STATUS: {
        draftState.status = 'runtime';
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState };
export default reducer;
