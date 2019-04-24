import {
  GET_ARTICLES,
  GET_ARTICLES_SUCCEEDED,
  ON_CHANGE,
  SUBMIT,
  SUBMIT_SUCCEEDED,
} from './constants';

export function getArticles() {
  return {
    type: GET_ARTICLES,
  };
}

export function getArticlesSucceeded(articles) {
  return {
    type: GET_ARTICLES_SUCCEEDED,
    articles,
  };
}

export function onChange({ target }) {
  return {
    type: ON_CHANGE,
    value: target.value,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}
