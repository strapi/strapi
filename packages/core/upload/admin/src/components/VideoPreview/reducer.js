import produce from 'immer';

const initialState = {
  dataLoaded: false,
  duration: 0,
  isHover: false,
  metadataLoaded: false,
  seeked: false,
  snapshot: false,
  isError: false,
};

const videoReducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'DATA_LOADED': {
        draftState.dataLoaded = true;
        draftState.duration = action.duration;

        break;
      }
      case 'METADATA_LOADED': {
        draftState.metadataLoaded = true;
        break;
      }
      case 'SEEKED': {
        draftState.seeked = true;
        break;
      }
      case 'SET_IS_HOVER': {
        draftState.isHover = action.isHover;
        break;
      }
      case 'SET_SNAPSHOT': {
        draftState.snapshot = action.snapshot;
        break;
      }
      case 'SET_ERROR': {
        draftState.isError = action.isError;
        break;
      }
      default:
        return state;
    }
  });

export default videoReducer;
export { initialState };
