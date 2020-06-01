/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  collapseContentTypeAttribute: null,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'OPEN_CONTENT_TYPE_ATTRIBUTES': {
        if (state.collapseContentTypeAttribute === action.contentTypeToOpen) {
          draftState.collapseContentTypeAttribute = null;
        } else {
          draftState.collapseContentTypeAttribute = action.contentTypeToOpen;
        }
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
