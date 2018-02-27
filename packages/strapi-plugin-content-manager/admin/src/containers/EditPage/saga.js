import { LOCATION_CHANGE } from 'react-router-redux';
import { get, isArray } from 'lodash';
import {
  call,
  cancel,
  fork,
  put,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';

// Utils.
import cleanData from 'utils/cleanData';
import request from 'utils/request';
import templateObject from 'utils/templateObject';

import { getDataSucceeded, setFormErrors, submitSuccess } from './actions';
import { GET_DATA,SUBMIT } from './constants';
import {
  makeSelectIsCreating,
  makeSelectModelName,
  makeSelectRecord,
  makeSelectSource,
} from './selectors';

function* dataGet(action) {
  try {
    const modelName = yield select(makeSelectModelName());
    const params = { source: action.source };
    const response = yield call(
      request,
      `/content-manager/explorer/${modelName}/${action.id}`,
      { method: 'GET', params },
    );

    const pluginHeaderTitle = yield call(templateObject, { mainField: action.mainField }, response);
    yield put(getDataSucceeded(action.id, response, pluginHeaderTitle.mainField));
  } catch(err) {
    strapi.notification.error('content-manager.error.record.fetch');
  }
}

export function* submit() {
  const currentModelName = yield select(makeSelectModelName());
  const record = yield select(makeSelectRecord());
  const recordJSON = record.toJSON();
  const source = yield select(makeSelectSource());
  const isCreating = yield select(makeSelectIsCreating());

  try {
    const recordCleaned = Object.keys(recordJSON).reduce((acc, current) => {
      acc.append(current, cleanData(recordJSON[current], 'value', 'id'));

      return acc;
    }, new FormData());

    const id = isCreating ? '' : recordCleaned.id;
    const params = { source };

    const requestUrl = `/content-manager/explorer/${currentModelName}/${id}`;

    // Call our request helper (see 'utils/request')
    yield call(request, requestUrl, {
      method: isCreating ? 'POST' : 'PUT',
      headers: {
        'X-Forwarded-Host': 'strapi',
      },
      body: recordCleaned,
      params,
    }, false, false);

    strapi.notification.success('content-manager.success.record.save');
    yield put(submitSuccess());


  } catch(err) {
    if (isArray(err.response.payload.message)) {
      const errors = err.response.payload.message.reduce((acc, current) => {
        const error = current.messages.reduce((acc, current) => {
          acc.errorMessage = current.id;

          return acc;
        }, { id: 'components.Input.error.custom-error', errorMessage: '' });
        acc.push(error);

        return acc;
      }, []);

      const name = get(err.response.payload.message, ['0', 'messages', '0', 'field']);

      yield put(setFormErrors([{ name, errors }]));
    }
    strapi.notification.error(isCreating ? 'content-manager.error.record.create' : 'content-manager.error.record.update');
  }
}

function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, GET_DATA, dataGet);
  yield fork(takeLatest, SUBMIT, submit);

  yield take(LOCATION_CHANGE);

  yield cancel(loadDataWatcher);
}

export default defaultSaga;
