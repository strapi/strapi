/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  collectionTypes: [],
  singleTypes: [],
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_CONTENT_TYPES': {
        draftState.collectionTypes = initialState.collectionTypes;
        draftState.singleTypes = initialState.singleTypes;
        draftState.isLoading = true;
        break;
      }
      case 'GET_CONTENT_TYPES_SUCCEDED': {
        const getContentTypeByKind = kind =>
          action.data.filter(
            contentType => contentType.isDisplayed && contentType.schema.kind === kind
          );

        draftState.isLoading = false;
        draftState.collectionTypes = getContentTypeByKind('collectionType');
        draftState.singleTypes = getContentTypeByKind('singleType');
        break;
      }
      case 'GET_CONTENT_TYPES_ERROR': {
        draftState.collectionTypes = initialState.collectionTypes;
        draftState.singleTypes = initialState.singleTypes;
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
