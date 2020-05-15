import { produce } from 'immer';
import { checkIfAllEntriesAreSelected, updateRows } from './utils';

const initialState = {
  rows: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, drafState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        drafState.rows.forEach((row, index) => {
          if (index === action.index) {
            const currentRow = drafState.rows[index];
            const value = currentRow._isChecked;

            drafState.rows[index]._isChecked = !value;
          }
        });

        break;
      }
      case 'ON_CHANGE_ALL': {
        const areAllEntriesSelected = checkIfAllEntriesAreSelected(state.rows);

        drafState.rows = updateRows(drafState.rows, !areAllEntriesSelected);

        break;
      }
      case 'SET_DATA': {
        const rows = updateRows(action.data, false);

        drafState.rows = rows;
        break;
      }
      default:
        return drafState;
    }
  });

export { initialState, reducer };
