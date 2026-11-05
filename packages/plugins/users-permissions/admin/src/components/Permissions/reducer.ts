import { produce } from 'immer';

export type State = { collapses: { name: string; isOpen: boolean }[] };
type Action = { type: 'TOGGLE_COLLAPSE'; index: number };

const initialState: State = {
  collapses: [],
};

/** Toggles the active permission group while closing other groups. */
const reducer = (state: State, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
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
