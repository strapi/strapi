/**
 *
 * HomePage reducer
 */

import { fromJS, List, Map } from 'immutable';

import { GET_ARTICLES_SUCCEEDED, ON_CHANGE, SUBMIT_SUCCEEDED } from './constants';

const initialState = fromJS({
  articles: List([]),
  body: Map({
    email: '',
  }),
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_ARTICLES_SUCCEEDED:
      return state.update('articles', () => List(action.articles));
    case ON_CHANGE:
      return state.updateIn(['body', 'email'], () => action.value);
    case SUBMIT_SUCCEEDED:
      return state.updateIn(['body', 'email'], () => '');
    default:
      return state;
  }
}

export default homePageReducer;
