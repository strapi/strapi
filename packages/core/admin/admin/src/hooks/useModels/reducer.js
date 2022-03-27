/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  collectionTypes: [],
  components: [],
  isLoading: true,
  singleTypes: [],
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_MODELS': {
        draftState.collectionTypes = initialState.collectionTypes;
        draftState.singleTypes = initialState.singleTypes;
        draftState.components = initialState.components;
        draftState.isLoading = true;
        break;
      }
      case 'GET_MODELS_ERROR': {
        draftState.collectionTypes = initialState.collectionTypes;
        draftState.singleTypes = initialState.singleTypes;
        draftState.components = initialState.components;
        draftState.isLoading = false;
        break;
      }
      case 'GET_MODELS_SUCCEEDED': {
        const getContentTypeByKind = kind =>
          action.contentTypes.filter(
            contentType => contentType.isDisplayed && contentType.kind === kind
          );

        draftState.isLoading = false;
        draftState.collectionTypes = getContentTypeByKind('collectionType');
        draftState.singleTypes = getContentTypeByKind('singleType');
        draftState.components = action.components;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
