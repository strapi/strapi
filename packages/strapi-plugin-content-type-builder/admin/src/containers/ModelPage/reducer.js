/*
 *
 * ModelPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
/* eslint-disable new-cap */
import {
  DELETE_ATTRIBUTE,
  MODEL_FETCH_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  model: Map({
    attributes: List(),
  }),
});

function modelPageReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_ATTRIBUTE:
      // console.log(action.position);
      // console.log(state.getIn(['model', 'attributes']))
      return state
        .updateIn(['model', 'attributes'], (list) => list.splice(action.position, 1));
    case MODEL_FETCH_SUCCEEDED:
      return state
        .set('model', Map(action.model.model))
        .setIn(['model', 'attributes'], List(action.model.model.attributes));
    default:
      return state;
  }
}

export default modelPageReducer;
