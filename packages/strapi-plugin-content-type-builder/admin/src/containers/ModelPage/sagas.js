import { LOCATION_CHANGE } from 'react-router-redux';
import { capitalize, forEach, get, includes, map, replace, set, size, unset, sortBy } from 'lodash';
import pluralize from 'pluralize';
import { takeLatest, call, take, put, fork, cancel, select } from 'redux-saga/effects';

import request from 'utils/request';

import { temporaryContentTypePosted } from 'containers/App/actions';

import { storeData } from '../../utils/storeData';

import { MODEL_FETCH, SUBMIT } from './constants';
import { modelFetchSucceeded, postContentTypeSucceeded, resetShowButtonsProps, setButtonLoader, unsetButtonLoader, submitActionSucceeded } from './actions';
import { makeSelectModel } from './selectors';

export function* fetchModel(action) {
  try {
    const requestUrl = `/content-type-builder/models/${action.modelName}`;

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(modelFetchSucceeded(data));

    yield put(unsetButtonLoader());

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* submitChanges(action) {
  try {
    // Show button loader
    yield put(setButtonLoader());

    const modelName = get(storeData.getContentType(), 'name');

    const body = yield select(makeSelectModel());

    map(body.attributes, (attribute, index) => {
      // Remove the connection key from attributes
      if (attribute.connection) {
        unset(body.attributes[index], 'connection');
      }

      forEach(attribute.params, (value, key) => {
        if (key === 'dominant' && get(attribute.params, 'nature') !== 'manyToMany') {
          delete body.attributes[index].params.dominant;
        }

        if (includes(key, 'Value')) {
          // Remove and set needed keys for params
          set(body.attributes[index].params, replace(key, 'Value', ''), value);
          unset(body.attributes[index].params, key);
        }

        if (!value) {
          const paramsKey = includes(key, 'Value') ? replace(key,'Value', '') : key;
          unset(body.attributes[index].params, paramsKey);
        }
      });
    });

    const method = modelName === body.name ? 'POST' : 'PUT';
    const baseUrl = '/content-type-builder/models/';
    const requestUrl = method === 'POST' ? baseUrl : `${baseUrl}${body.name}`;
    const opts = { method, body };
    const response = yield call(request, requestUrl, opts, true);

    if (response.ok) {
      if (method === 'POST') {
        storeData.clearAppStorage();
        yield put(temporaryContentTypePosted(size(get(body, 'attributes'))));
        yield put(postContentTypeSucceeded());

        const leftMenuContentTypes = get(action.context.plugins.toJS(), ['content-manager', 'leftMenuSections']);
        const newContentType = body.name.toLowerCase();

        if (leftMenuContentTypes) {
          leftMenuContentTypes[0].links.push({ destination: newContentType, label: capitalize(pluralize(newContentType)) });
          leftMenuContentTypes[0].links = sortBy(leftMenuContentTypes[0].links, 'label');
          action.context.updatePlugin('content-manager', 'leftMenuSections', leftMenuContentTypes);
        }

        window.Strapi.notification.success('content-type-builder.notification.success.message.contentType.create');

        // Temporary patch to fix menu links.
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        window.Strapi.notification.success('content-type-builder.notification.success.message.contentType.edit');
      }

      yield put(submitActionSucceeded());

      yield put(resetShowButtonsProps());
      // Remove loader
      yield put(unsetButtonLoader());
    }

  } catch(error) {
    window.Strapi.notification.error(error);
  }
}

function* defaultSaga() {
  const loadModelWatcher = yield fork(takeLatest, MODEL_FETCH, fetchModel);
  // const deleteAttributeWatcher = yield fork(takeLatest, DELETE_ATTRIBUTE, attributeDelete);
  const loadSubmitChanges = yield fork(takeLatest, SUBMIT, submitChanges);

  yield take(LOCATION_CHANGE);

  yield cancel(loadModelWatcher);
  // yield cancel(deleteAttributeWatcher);
  yield cancel(loadSubmitChanges);
}

export default defaultSaga;
