import { fromJS } from 'immutable';

const initialState = fromJS({
  isOpened: false,
  shouldShowVideoOnboarding: true,
  videos: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'HIDE_VIDEO_ONBOARDING':
      return state.update('shouldShowVideoOnboarding', () => false);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
