/*
 *
 * Onboarding reducer
 *
 */

import { fromJS } from 'immutable';
import { GET_VIDEOS_SUCCEEDED, ON_CLICK, SET_VIDEOS_DURATION, UPDATE_VIDEO_START_TIME, SET_VIDEO_END, REMOVE_VIDEOS } from './constants';

const initialState = fromJS({
  videos: fromJS([]),
});

function onboardingReducer(state = initialState, action) {
  switch (action.type) {
    case GET_VIDEOS_SUCCEEDED:
      return state.update('videos', () => fromJS(action.videos));
    case ON_CLICK:
      return state.updateIn(['videos'], list => {
        return list.reduce((acc, current, index) => {

          if (index === action.index) {
            return acc.updateIn([index, 'isOpen'], v => !v);
          }

          return acc.updateIn([index, 'isOpen'], () => false);
        }, list);
      });
    case SET_VIDEOS_DURATION:
      return state.updateIn(['videos', action.index, 'duration'], () => action.duration);
    case UPDATE_VIDEO_START_TIME:
      return state.updateIn(['videos'], list => {
        return list.reduce((acc, current, index) => {

          if (index === action.index) {
            return acc.updateIn([index, 'startTime'], () => action.startTime);
          }

          return acc.updateIn([index, 'startTime'], () => 0);
        }, list);
      });
    case SET_VIDEO_END:
      return state.updateIn(['videos', action.index, 'end'], () => action.end);
    case REMOVE_VIDEOS:
      return initialState;
    default:
      return state;
  }
}

export default onboardingReducer;
