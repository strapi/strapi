import 'whatwg-fetch';
import { dropRight, take } from 'lodash';
import removeMd from 'remove-markdown';
import { all, call, fork, put, select, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';
import { getArticlesSucceeded, submitSucceeded } from './actions';
import { GET_ARTICLES, SUBMIT } from './constants';
import { makeSelectBody } from './selectors';

function* getArticles() {
  try {
    const articles = yield call(fetchArticles);
    const posts = articles.posts.reduce((acc, curr) => {
      // Limit to 200 characters and remove last word.
      const content = dropRight(
        take(removeMd(curr.markdown), 250)
          .join('')
          .split(' '),
      ).join(' ');

      acc.push({
        title: curr.title,
        link: curr.slug,
        content: `${content} [...]`,
      });

      return acc;
    }, []);

    yield put(getArticlesSucceeded(posts));
  } catch (err) {
    // Silent
  }
}

function* submit() {
  try {
    const body = yield select(makeSelectBody());
    yield call(request, 'https://analytics.strapi.io/register', {
      method: 'POST',
      body,
    });
  } catch (err) {
    // silent
  } finally {
    strapi.notification.success('HomePage.notification.newsLetter.success');
    yield put(submitSucceeded());
  }
}

function* defaultSaga() {
  yield all([
    fork(takeLatest, SUBMIT, submit),
    fork(takeLatest, GET_ARTICLES, getArticles),
  ]);
}

function fetchArticles() {
  return fetch(
    'https://blog.strapi.io/ghost/api/v0.1/posts/?client_id=ghost-frontend&client_secret=1f260788b4ec&limit=2',
    {},
  ).then(resp => {
    return resp.json ? resp.json() : resp;
  });
}
export default defaultSaga;
