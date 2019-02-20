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
      },
      false,
      true,
      { noAuth: true },
    );

    let currTimes = Array.apply(null, Array(videos.length)).map(Number.prototype.valueOf,0);

    // Retrieve start time if enable in localStorage
    if (localStorage.getItem('videos')) {
      currTimes.splice(0, currTimes.length, ...JSON.parse(localStorage.getItem('videos')));
    } else {
      localStorage.setItem('videos', JSON.stringify(currTimes));
    }

    yield put(
      getVideosSucceeded(
        videos.map((video, index) => {
          video.isOpen = false;
          video.duration = null;
          video.startTime = currTimes[index];

          return video;
        }),
      ),
    );
  } catch (err) {
    console.log('err');
    console.log({ err });
  }
}

function* defaultSaga() {
  yield all([fork(takeLatest, GET_VIDEOS, getVideos)]);
}

export default defaultSaga;
