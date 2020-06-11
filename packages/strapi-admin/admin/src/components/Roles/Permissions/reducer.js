/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  collapsePath: [],
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'COLLAPSE_PATH': {
        const { index, value } = action;

        if (state.collapsePath[index] === value) {
          draftState.collapsePath = state.collapsePath.slice().splice(0, index);
        } else {
          draftState.collapsePath = [...state.collapsePath.slice().splice(0, index), value];
        }
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
