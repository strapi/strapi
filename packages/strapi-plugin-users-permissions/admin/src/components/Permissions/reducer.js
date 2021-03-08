import produce from 'immer';

const initialState = {
  collapses: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'TOGGLE_COLLAPSE': {
        draftState.collapses = state.collapses.map((collapse, index) => {
          if (index === action.index) {
            return { ...collapse, isOpen: !collapse.isOpen };
          }

          return { ...collapse, isOpen: false };
        });

        break;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
