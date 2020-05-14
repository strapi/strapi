import { fromJS } from 'immutable';

const initialState = fromJS({
  isLoading: true,
  isOpen: false,
  videos: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('isOpen', () => !action.didWatchVideos)
        .update('isLoading', () => false)
        .update('videos', () => fromJS(action.videos));
    case 'SET_IS_OPEN':
      return state.update('isOpen', v => !v);
    case 'SET_VIDEO_DURATION':
      return state.updateIn(['videos', action.videoIndex, 'duration'], () => {
        return parseFloat(action.duration, 10);
      });
    case 'TOGGLE_VIDEO_MODAL':
      return state.update('videos', list => {
        return list.map((item, index) => {
          if (index === action.videoIndexToOpen) {
            return item.update('isOpen', v => !v);
          }

          return item.set('isOpen', false);
        });
      });
    case 'UPDATE_VIDEO_STARTED_TIME_AND_PLAYED_INFOS': {
      const updatedState = state.updateIn(['videos', action.videoIndex], video => {
        const elapsedTime = parseFloat(action.elapsedTime, 10);
        const videoDuration = parseFloat(video.get('duration', 10));
        const percentElapsedTime = (elapsedTime * 100) / videoDuration;

        return video
          .update('startTime', () => elapsedTime)
          .update('end', oldValue => {
            if (oldValue === true) {
              return true;
            }

            return percentElapsedTime > 80;
          });
      });

      const videos = updatedState.get('videos').map(video => video.set('isOpen', false));

      // Update the local storage
      localStorage.setItem('videos', JSON.stringify(videos.toJS()));

      return updatedState;
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
