import { LOCATION_CHANGE } from 'react-router-redux';
import { findIndex, get, isArray, isEmpty, includes, isNumber, isString, map } from 'lodash';
import {
  call,
  cancel,
  fork,
  put,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';

import { makeSelectSchema } from 'containers/App/selectors';

// Utils.
import cleanData from 'utils/cleanData';
import request from 'utils/request';
import templateObject from 'utils/templateObject';

import {
  getDataSucceeded,
  setFormErrors,
  setLoader,
  submitSuccess,
  unsetLoader,
} from './actions';
import { GET_DATA, SUBMIT } from './constants';
import {
  makeSelectFileRelations,
  makeSelectIsCreating,
  makeSelectModelName,
  makeSelectRecord,
  makeSelectSource,
} from './selectors';

function* dataGet(action) {
  try {
    const modelName = yield select(makeSelectModelName());
    const params = { source: action.source };
    const [response] = yield [
      call(request, `/content-manager/explorer/${modelName}/${action.id}`, { method: 'GET', params }),
    ];
    const pluginHeaderTitle = yield call(templateObject, { mainField: action.mainField }, response);

    yield put(getDataSucceeded(action.id, response, pluginHeaderTitle.mainField));
  } catch(err) {
    strapi.notification.error('content-manager.error.record.fetch');
  }
}

export function* submit() {
  const currentModelName = yield select(makeSelectModelName());
  const fileRelations = yield select(makeSelectFileRelations());
  const isCreating = yield select(makeSelectIsCreating());
  const record = yield select(makeSelectRecord());
  const source = yield select(makeSelectSource());
  const schema = yield select(makeSelectSchema());
  let shouldAddTranslationSuffix = false;
  // Remove the updated_at & created_at fields so it is updated correctly when using Postgres or MySQL db
  if (record.updated_at) {
    delete record.created_at;
    delete record.updated_at;
  }

  // Remove the updatedAt & createdAt fields so it is updated correctly when using MongoDB
  if (record.updatedAt) {
    delete record.createdAt;
    delete record.updatedAt;
  }

  try {
    // Show button loader
    yield put(setLoader());
    const recordCleaned = Object.keys(record).reduce((acc, current) => {
      const attrType = source !== 'content-manager' ? get(schema, ['models', 'plugins', source, currentModelName, 'fields', current, 'type'], null) : get(schema, ['models', currentModelName, 'fields', current, 'type'], null);
      const cleanedData = attrType === 'json' ? record[current] : cleanData(record[current], 'value', 'id');


      if (isString(cleanedData) || isNumber(cleanedData)) {
        acc.append(current, cleanedData);
      } else if (findIndex(fileRelations, ['name', current]) !== -1) {
        // Don't stringify the file
        map(record[current], (file) => {
          if (file instanceof File) {
            return acc.append(current, file);
          }

          return acc.append(current, JSON.stringify(file));
        });

        if (isEmpty(record[current])) {
          // Send an empty array if relation is manyToManyMorph else an object
          const data = get(fileRelations, [findIndex(fileRelations, ['name', current]), 'multiple']) ? [] : {};
          acc.append(current, JSON.stringify(data));
        }
      } else {
        acc.append(current,  JSON.stringify(cleanedData));
      }

      return acc;
    }, new FormData());

    // Helper to visualize FormData
    // for(var pair of recordCleaned.entries()) {
    //   console.log(pair[0]+ ', '+ pair[1]);
    // }

    const id = isCreating ? '' : record.id || record._id;
    const params = { source };
    // Change the request helper default headers so we can pass a FormData
    const headers = {
      'X-Forwarded-Host': 'strapi',
    };

    const requestUrl = `/content-manager/explorer/${currentModelName}/${id}`;

    // Call our request helper (see 'utils/request')
    // Pass false and false as arguments so the request helper doesn't stringify
    // the body and doesn't watch for the server to restart
    yield call(request, requestUrl, {
      method: isCreating ? 'POST' : 'PUT',
      headers,
      body: recordCleaned,
      params,
    }, false, false);

    strapi.notification.success('content-manager.success.record.save');
    // Redirect the user to the ListPage container
    yield put(submitSuccess());

  } catch(err) {
    if (isArray(err.response.payload.message)) {
      const errors = err.response.payload.message.reduce((acc, current) => {
        const error = current.messages.reduce((acc, current) => {
          if (includes(current.id, 'Auth')) {
            acc.id = `users-permissions.${current.id}`;
            shouldAddTranslationSuffix = true;

            return acc;
          }
          acc.errorMessage = current.id;

          return acc;
        }, { id: 'components.Input.error.custom-error', errorMessage: '' });
        acc.push(error);

        return acc;
      }, []);

      const name = get(err.response.payload.message, ['0', 'messages', '0', 'field', '0']);

      yield put(setFormErrors([{ name, errors }]));
    }

    const notifErrorPrefix = source === 'users-permissions' && shouldAddTranslationSuffix ? 'users-permissions.' : '';
    strapi.notification.error(`${notifErrorPrefix}${get(err.response, ['payload', 'message', '0', 'messages', '0', 'id'], isCreating ? 'content-manager.error.record.create' : 'content-manager.error.record.update')}`);
  } finally {
    yield put(unsetLoader());
  }
}

function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, GET_DATA, dataGet);
  yield fork(takeLatest, SUBMIT, submit);

  yield take(LOCATION_CHANGE);

  yield cancel(loadDataWatcher);
}

export default defaultSaga;
