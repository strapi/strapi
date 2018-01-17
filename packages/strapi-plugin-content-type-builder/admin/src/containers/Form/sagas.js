import pluralize from 'pluralize';
import { capitalize, findIndex, get, isEmpty, sortBy } from 'lodash';
import { takeLatest, call, put, fork, select } from 'redux-saga/effects';
import request from 'utils/request';

import {
  connectionsFetchSucceeded,
  contentTypeActionSucceeded,
  contentTypeFetchSucceeded,
  setButtonLoading,
  unsetButtonLoading,
} from './actions';

import {
  CONNECTIONS_FETCH,
  CONTENT_TYPE_EDIT,
  CONTENT_TYPE_FETCH,
} from './constants';

import {
  makeSelectInitialDataEdit,
  makeSelectModifiedDataEdit,
} from './selectors';

export function* editContentType(action) {
  try {
    const initialContentType = yield select(makeSelectInitialDataEdit());
    const requestUrl = `/content-type-builder/models/${initialContentType.name}`;
    const body = yield select(makeSelectModifiedDataEdit());
    const opts = {
      method: 'PUT',
      body,
    };

    yield put(setButtonLoading());

    const leftMenuContentTypes = get(action.context.plugins.toJS(), ['content-manager', 'leftMenuSections']);
    const leftMenuContentTypesIndex = !isEmpty(leftMenuContentTypes) ? findIndex(get(leftMenuContentTypes[0], 'links'), ['destination', initialContentType.name.toLowerCase()]) : -1;
    const response = yield call(request, requestUrl, opts, true);

    if (response.ok) {
      yield put(contentTypeActionSucceeded());
      yield put(unsetButtonLoading());

      // Update admin left menu content types section
      if (leftMenuContentTypesIndex !== -1) {
        const name = body.name.toLowerCase();
        const updatedSectionLink = {
          destination: name,
          label: capitalize(pluralize(name)),
        };

        leftMenuContentTypes[0].links.splice(leftMenuContentTypesIndex, 1, updatedSectionLink);
        leftMenuContentTypes[0].links = sortBy(leftMenuContentTypes[0].links, 'label');
        action.context.updatePlugin('content-manager', 'leftMenuSections', leftMenuContentTypes);
      }
      strapi.notification.success('content-type-builder.notification.success.message.contentType.edit');
    }
  } catch(error) {
    strapi.notification.error(get(error, ['response', 'payload', 'message'], 'notification.error'));
  }
}

export function* fetchConnections() {
  try {
    const requestUrl = '/content-type-builder/connections';
    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(connectionsFetchSucceeded(data));

  } catch(error) {
    strapi.notification.error('content-type-builder.notification.error.message');
  }
}

export function* fetchContentType(action) {
  try {
    const requestUrl = `/content-type-builder/models/${action.contentTypeName.split('&source=')[0]}`;
    const params = {};
    const source = action.contentTypeName.split('&source=')[1];

    if (source) {
      params.source = source;
    }

    const data = yield call(request, requestUrl, { method: 'GET', params });

    yield put(contentTypeFetchSucceeded(data));

  } catch(error) {
    strapi.notification.error('content-type-builder.notification.error.message');
  }
}

// Individual exports for testing
function* defaultSaga() {
  yield fork(takeLatest, CONNECTIONS_FETCH, fetchConnections);
  yield fork(takeLatest, CONTENT_TYPE_EDIT, editContentType);
  yield fork(takeLatest, CONTENT_TYPE_FETCH, fetchContentType);
}

export default defaultSaga;
