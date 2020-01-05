/* eslint-disable */
import { all, fork, call, put, select, takeLatest } from 'redux-saga/effects';
import { EMIT_EVENT } from './constants';
import { makeSelectUuid } from '../App/selectors';

export function* emitter(action) {
  try {
    const requestURL = 'https://analytics.strapi.io/track';
    const uuid = yield select(makeSelectUuid());
    const { event, properties } = action;

    if (uuid) {
      yield call(
        fetch, // eslint-disable-line no-undef
        requestURL,
        {
          method: 'POST',
          body: JSON.stringify({ event, uuid, properties }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (err) {}
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([fork(takeLatest, EMIT_EVENT, emitter)]);
}
