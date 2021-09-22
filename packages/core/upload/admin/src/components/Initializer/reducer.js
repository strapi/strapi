import produce from 'immer';
import { SET_FILE_MODE_TIMESTAMPS } from './constants';

const initialState = {
  // TODO: rename to camelCase
  fileModelTimestamps: ['createdAt', 'updatedAt'],
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case SET_FILE_MODE_TIMESTAMPS: {
        // draftState.fileModelTimestamps = action.timestamps;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
