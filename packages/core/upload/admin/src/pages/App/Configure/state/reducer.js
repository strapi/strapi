import produce from 'immer'; // current
import set from 'lodash/set';
import get from 'lodash/get';
import { ON_CHANGE, SET_LOADED } from './actionTypes';

const initialState = {
  initialData: {},
  modifiedData: {},
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case ON_CHANGE: {
        set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      case SET_LOADED: {
        set(draftState, ['initialData'], get(draftState, ['modifiedData'], {}));
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
