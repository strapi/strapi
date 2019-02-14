import { GET_VIDEOS } from './constants';
import { getVideosSucceeded } from './actions';
import request from 'utils/request';

import { all, call, fork, takeLatest, put } from 'redux-saga/effects';

function* getVideos() {
  try {
    const videos = yield call(request, 'https://strapi.io/videos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    yield put(
      getVideosSucceeded(
        videos.map(video => {
          video.isOpen = false;
          video.duration = null;

          return video;
        }),
      ),
    );
  } catch (err) {
    console.log({ err });
  }
}

function* defaultSaga() {
  yield all([fork(takeLatest, GET_VIDEOS, getVideos)]);
}

export default defaultSaga;
