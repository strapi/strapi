import 'whatwg-fetch';
import { padEnd, take } from 'lodash';
import removeMd from 'remove-markdown';
import {
  call,
  fork,
  put,
  select,
  takeLatest,
} from 'redux-saga/effects';

import request from 'utils/request';

import { getArticlesSucceeded, submitSucceeded } from './actions';
import { GET_ARTICLES, SUBMIT } from './constants';
import { makeSelectBody } from './selectors';

function* getArticles() {
  try {
    const articles = yield call(fetchArticles);
    const posts = articles.posts.reduce((acc, curr) => {
      const post = {
        title: curr.title,
        content: padEnd(take(removeMd(curr.markdown), 200).join(''), 203, '...'),
      };
      acc.push(post);

      return acc;
    }, []);

    yield put(getArticlesSucceeded(posts));
  } catch(err) {
    // Silent
  }
}


function* submit() {
  try {
    const body = yield select(makeSelectBody());
    yield call(request, 'https://analytics.strapi.io/register', { method: 'POST', body });
  } catch(err) {
    // silent
  } finally {
    strapi.notification.success('HomePage.notification.newsLetter.success');
    yield put(submitSucceeded());
  }
}

function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submit);
  yield fork(takeLatest, GET_ARTICLES, getArticles);
}


function fetchArticles() {
  return fetch('https://blog.strapi.io/ghost/api/v0.1/posts/?client_id=ghost-frontend&client_secret=1f260788b4ec&limit=2', {})
    .then(resp => {
      return resp.json ? resp.json() : resp;
    });
}
export default defaultSaga;
