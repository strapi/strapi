/*
 *
 * Onboarding reducer
 *
 */

import { fromJS } from 'immutable';
import { GET_VIDEOS_SUCCEEDED, ON_CLICK } from './constants';

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
    default:
      return state;
  }
}

export default onboardingReducer;
