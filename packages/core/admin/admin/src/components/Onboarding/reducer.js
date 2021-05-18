import produce from 'immer';
import set from 'lodash/set';

const initialState = {
  isLoading: true,
  isOpen: false,
  videos: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.isOpen = !action.didWatchVideos;
        draftState.isLoading = false;
        draftState.videos = action.videos;
        break;
      }

      case 'SET_IS_OPEN': {
        draftState.isOpen = !state.isOpen;
        break;
      }
      case 'SET_VIDEO_DURATION': {
        set(draftState, ['videos', action.videoIndex, 'duration'], parseFloat(action.duration, 10));
        break;
      }
      case 'TOGGLE_VIDEO_MODAL': {
        const nextVideos = state.videos.map((video, index) => {
          if (index === action.videoIndexToOpen) {
            return { ...video, isOpen: !video.isOpen };
          }

          return { ...video, isOpen: false };
        });
        draftState.videos = nextVideos;
        break;
      }
      case 'UPDATE_VIDEO_STARTED_TIME_AND_PLAYED_INFOS': {
        const nextVideos = state.videos.map((video, index) => {
          if (index !== action.videoIndex) {
            return video;
          }
          const elapsedTime = parseFloat(action.elapsedTime, 10);
          const videoDuration = parseFloat(video.duration, 10);
          const percentElapsedTime = (elapsedTime * 100) / videoDuration;
          const end = video.end === true ? video.end : percentElapsedTime > 80;

          return { ...video, startTime: elapsedTime, end };
        });

        // Update the local storage and make sure that the modal video does not automatically open
        localStorage.setItem(
          'videos',
          JSON.stringify(nextVideos.map(v => ({ ...v, isOpen: false })))
        );
        // Update the state
        draftState.videos = nextVideos;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
