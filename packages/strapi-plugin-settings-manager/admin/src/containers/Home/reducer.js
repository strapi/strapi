/*
 *
 * Home reducer
 *
 */

import { fromJS, Map, OrderedMap } from 'immutable';
import { remove } from 'lodash';
import {
  CONFIG_FETCH_SUCCEEDED,
  CHANGE_DEFAULT_LANGUAGE,
  CHANGE_INPUT,
  CANCEL_CHANGES,
  LANGUAGES_FETCH_SUCCEEDED,
  EDIT_SETTINGS_SUCCEEDED,
  LANGUAGE_ACTION_SUCCEEDED,
  DATABASES_FETCH_SUCCEEDED,
  DATABASE_ACTION_SUCCEEDED,
  LANGUAGE_DELETE,
  SPECIFIC_DATABASE_FETCH_SUCCEEDED,
  LANGUAGE_ACTION_ERROR,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: true,
  cancelAction: false,
  configsDisplay: OrderedMap(),
  initialData: Map(),
  modifiedData: Map(),
  listLanguages: Map(),
  addDatabaseSection: Map(),
  didCreatedNewLanguage: false,
  didCreatedNewDb: false,
  specificDatabase: OrderedMap(),
  dbNameTarget: '',
});

function homeReducer(state = initialState, action) {
  switch (action.type) {
    case CONFIG_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('configsDisplay', OrderedMap(action.configs))
        .set('initialData', Map(action.data))
        .set('modifiedData', Map(action.data));
    case CHANGE_INPUT:
      return state.updateIn(['modifiedData', action.key], () => action.value);
    case CANCEL_CHANGES:
      return state
      .set('modifiedData', state.get('initialData'))
      .set('cancelAction', !state.get('cancelAction'));
    case DATABASES_FETCH_SUCCEEDED:
      return state
        .set('configsDisplay', OrderedMap(action.configsDisplay))
        .set('didCreatedNewDb', false)
        .set('addDatabaseSection', OrderedMap(action.appDatabases))
        .set('specificDatabase', OrderedMap())
        .set('loading', false)
        .set('initialData', Map())
        .set('dbNameTarget', action.dbNameTarget)
        .set('modifiedData', Map(action.modifiedData));
    case LANGUAGE_DELETE:
      return state
        .updateIn(['configsDisplay', 'sections'], list => remove(list, (language) => language.name !== action.languageToDelete));
    case LANGUAGES_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('didCreatedNewLanguage', false)
        .set('configsDisplay', OrderedMap(action.configs))
        .set('initialData', Map())
        .set('modifiedData', Map())
        .set('listLanguages', Map(action.listLanguages));
    case EDIT_SETTINGS_SUCCEEDED:
      return state
        .set('configsDisplay', OrderedMap(action.optimisticResponse))
        .set('initialData', Map(action.data))
        .set('modifiedData', Map(action.data));
    case CHANGE_DEFAULT_LANGUAGE:
      return state
        .set('configsDisplay', OrderedMap(action.configsDisplay))
        .updateIn(['modifiedData', 'language.defaultLocale'], () => action.newLanguage);
    case LANGUAGE_ACTION_SUCCEEDED:
    case LANGUAGE_ACTION_ERROR:
      return state.set('didCreatedNewLanguage', true);
    case DATABASE_ACTION_SUCCEEDED:
      return state.set('didCreatedNewDb', true);
    case SPECIFIC_DATABASE_FETCH_SUCCEEDED:
      return state
        .set('specificDatabase', OrderedMap(action.database))
        .set('dbNameTarget', action.dbNameTarget)
        .set('initialData', Map(action.data))
        .set('modifiedData', Map(action.data));
    default:
      return state;
  }
}

export default homeReducer;
