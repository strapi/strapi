import { produce } from 'immer';
import { checkIfAllEntriesAreSelected, updateRows } from './utils';

const initialState = {
  rows: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        draftState.rows.forEach((row, index) => {
          if (index === action.index) {
            const currentRow = draftState.rows[index];
            const value = currentRow._isChecked;

            draftState.rows[index]._isChecked = !value;
          }
        });
        break;
      }
      case 'ON_CHANGE_ALL': {
        const areAllEntriesSelected = checkIfAllEntriesAreSelected(state.rows);

        draftState.rows = updateRows(draftState.rows, !areAllEntriesSelected);
        break;
      }
      case 'ON_CLICK_DELETE': {
        draftState.rows.forEach((row, index) => {
          if (index === action.index) {
            draftState.rows[index]._isChecked = true;
          } else {
            draftState.rows[index]._isChecked = false;
          }
        });
        break;
      }
      case 'SET_DATA': {
        const rows = updateRows(action.data, false);

        draftState.rows = rows;
        break;
      }
      case 'RESET_DATA_TO_DELETE': {
        draftState.rows.forEach((row, index) => {
          draftState.rows[index]._isChecked = false;
        });
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
