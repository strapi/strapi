/*
 *
 * HomePage reducer
 *
 */

import { fromJS, Map, OrderedMap } from 'immutable';
import { remove, sortBy } from 'lodash';
import {
  CONFIG_FETCH_SUCCEEDED,
  CHANGE_DEFAULT_LANGUAGE,
  CHANGE_INPUT,
  CANCEL_CHANGES,
  CLOSE_MODAL,
  LANGUAGES_FETCH_SUCCEEDED,
  EDIT_SETTINGS_SUCCEEDED,
  LANGUAGE_ACTION_SUCCEEDED,
  DATABASES_FETCH_SUCCEEDED,
  DATABASE_ACTION_SUCCEEDED,
  LANGUAGE_DELETE,
  SPECIFIC_DATABASE_FETCH_SUCCEEDED,
  LANGUAGE_ACTION_ERROR,
  DATABASE_DELETE,
  DATABASE_ACTION_ERROR,
  NEW_LANGUAGE_POST,
  EMPTY_DB_MODIFIED_DATA,
  SET_ERRORS,
  SET_LOADER,
  UNSET_LOADER,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: true,
  cancelAction: false,
  configsDisplay: OrderedMap({}),
  initialData: Map({}),
  modifiedData: Map({}),
  listLanguages: Map({}),
  addDatabaseSection: Map({}),
  didCreatedNewLanguage: false,
  didCreatedNewDb: false,
  specificDatabase: OrderedMap({}),
  dbNameTarget: '',
  selectOptions: Map({}),
  formValidations: [],
  formErrors: [],
  error: false,
  showLoader: false,
});
/* eslint-disable no-case-declarations */

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case CONFIG_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('configsDisplay', OrderedMap(action.configs))
        .set('initialData', Map(action.data))
        .set('modifiedData', Map(action.data))
        .set('formErrors', [])
        .set('formValidations', action.formValidations);
    case CHANGE_INPUT:
      return state
        .updateIn(['modifiedData', action.key], () => action.value);
    case CLOSE_MODAL:
      return state.set('error', !state.get('error'));
    case CANCEL_CHANGES:
      return state
        .set('modifiedData', state.get('initialData'))
        .set('formErrors', [])
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
        .set('formValidations', action.formValidations)
        .set('formErrors', [])
        .set('modifiedData', Map(action.modifiedData));
    case LANGUAGE_DELETE:
      return state
        .updateIn(['configsDisplay', 'sections'], list => remove(list, (language) => language.name !== action.languageToDelete));
    case DATABASE_DELETE:
      return state
        .updateIn(['configsDisplay', 'sections'], list => remove(list, (database) => database.name !== action.databaseToDelete));
    case LANGUAGES_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('didCreatedNewLanguage', false)
        .set('configsDisplay', OrderedMap(action.configs))
        .set('initialData', Map(action.selectedLanguage))
        .set('modifiedData', Map(action.selectedLanguage))
        .set('selectOptions', Map(action.selectOptions))
        .set('formErrors', [])
        .set('listLanguages', Map(action.listLanguages));
    case EDIT_SETTINGS_SUCCEEDED:
      return state
        .set('initialData', state.get('modifiedData'))
        .set('error', !state.get('error'))
        .set('formErrors', []);
    case CHANGE_DEFAULT_LANGUAGE:
      return state
        .set('configsDisplay', OrderedMap(action.configsDisplay))
        .updateIn(['modifiedData', 'language.defaultLocale'], () => action.newLanguage);
    case LANGUAGE_ACTION_SUCCEEDED:
      return state.set('error', !state.get('error')).set('modifiedData', state.get('initialData'));
    case LANGUAGE_ACTION_ERROR:
      return state.set('didCreatedNewLanguage', true).set('error', !state.get('error'));
    case DATABASE_ACTION_SUCCEEDED:
      const newDefaultDbConnection = state.getIn(['modifiedData', 'database.defaultConnection']);
      return state
        .set('modifiedData', Map())
        .setIn(['modifiedData', 'database.defaultConnection'], newDefaultDbConnection)
        .set('formErrors', [])
        .set('error', !state.get('error'))
        .set('didCreatedNewDb', true);
    case DATABASE_ACTION_ERROR:
      return state
        .set('error', !state.get('error'))
        .set('formErrors', action.formErrors);
    case SPECIFIC_DATABASE_FETCH_SUCCEEDED:
      return state
        .set('specificDatabase', OrderedMap(action.database))
        .set('dbNameTarget', action.dbNameTarget)
        .set('initialData', Map(action.data))
        .set('formValidations', action.formValidations)
        .set('modifiedData', Map(action.data));
    case EMPTY_DB_MODIFIED_DATA:
      const defaultDbConnection = state.getIn(['modifiedData', 'database.defaultConnection']);
      return state
        .set('modifiedData', Map())
        .set('dbNameTarget', 'database.connections.${name}.name') // eslint-disable-line no-template-curly-in-string
        .set('formErrors', [])
        .setIn(['modifiedData', 'database.defaultConnection'], defaultDbConnection);
    case NEW_LANGUAGE_POST:
      const sections = state.getIn(['configsDisplay', 'sections']);
      sections.push({ active: false, name: state.getIn(['modifiedData', 'language.defaultLocale']) });
      const newSections = sortBy(sections, (o) => o.name);
      return state.setIn(['configsDisplay', 'sections'], newSections);
    case SET_ERRORS:
      return state
        .set('formErrors', action.errors);
    case SET_LOADER:
      return state.set('showLoader', true);
    case UNSET_LOADER:
      return state.set('showLoader', false);
    default:
      return state;
  }
}

export default homePageReducer;
