import { fromJS } from 'immutable';

const initialState = fromJS({
  dataLoaded: false,
  duration: 0,
  isHover: false,
  metadataLoaded: false,
  seeked: false,
  snapshot: false,
  isError: false,
});

const videoReducer = (state, action) => {
  switch (action.type) {
    case 'DATA_LOADED':
      return state.update('dataLoaded', () => true).update('duration', () => action.duration);
    case 'METADATA_LOADED':
      return state.update('metadataLoaded', () => true);
    case 'SEEKED':
      return state.update('seeked', () => true);
    case 'SET_IS_HOVER':
      return state.update('isHover', () => action.isHover);
    case 'SET_SNAPSHOT':
      return state.update('snapshot', () => action.snapshot);
    case 'SET_ERROR':
      return state.update('isError', () => action.isError);
    default:
      return state;
  }
};

export default videoReducer;
export { initialState };
