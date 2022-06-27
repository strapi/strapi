/* eslint-disable consistent-return */
import produce from 'immer';
import { set, get } from 'lodash';

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
        const pathToValue = ['modifiedData', ...action.keys];
        const oldValues = get(state, pathToValue, {});
        const updatedValues = Object.keys(oldValues).reduce((acc, current) => {
          acc[current] = action.value;

          return acc;
        }, {});

        set(draftState, pathToValue, { ...updatedValues });

        break;
      }
      case 'ON_CHANGE_READ_ONLY': {
        const pathToValue = ['modifiedData', ...action.keys];
        const oldValues = get(state, pathToValue, {});
        const updatedValues = Object.keys(oldValues).reduce((acc, current) => {
          if (current === 'find' || current === 'find-one') {
            acc[current] = true;
          } else {
            acc[current] = false;
          }

          return acc;
        }, {});

        set(draftState, pathToValue, { ...updatedValues });

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
