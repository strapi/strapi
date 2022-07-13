/* eslint-disable consistent-return */
import produce from 'immer';
import { set } from 'lodash';
import togglePermissions from './utils/togglePermissions';

export const initialState = {
  initialData: {},
  modifiedData: {},
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.name.split('.')], action.value);
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
