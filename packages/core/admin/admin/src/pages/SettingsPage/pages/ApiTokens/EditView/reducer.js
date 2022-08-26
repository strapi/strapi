/* eslint-disable consistent-return */
import produce from 'immer';
import { set, pull } from 'lodash';
import togglePermissions from './utils/togglePermissions';

export const initialState = {
  data: {},
  selectedActions: [],
};

const reducer = (state, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_CHANGE': {
        if (draftState.selectedActions.includes(action.value)) {
          pull(draftState.selectedActions, action.value);
        } else {
          // fill(draftState.selectedActions, action.value);
          draftState.selectedActions.push(action.value);
        }
        break;
      }
      case 'ON_CHANGE_SELECT_ALL': {
        const { pathToValue, updatedValues } = togglePermissions(action, state);

        set(draftState, pathToValue, { ...updatedValues });

        break;
      }
      case 'ON_CHANGE_READ_ONLY': {
        const { pathToValue, updatedValues } = togglePermissions(action, state, [
          'find',
          'findOne',
        ]);

        set(draftState, pathToValue, { ...updatedValues });

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
