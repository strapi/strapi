import produce from 'immer';
import set from 'lodash/set';

import pluginId from '../pluginId';

import { ADD_LOCALE, DELETE_LOCALE, RESOLVE_LOCALES, UPDATE_LOCALE } from './constants';

export const initialState = {
  isLoading: true,
  locales: [],
};

const localeReducer = produce((draftState = initialState, action = {}) => {
  switch (action.type) {
    case RESOLVE_LOCALES: {
      draftState.isLoading = false;
      draftState.locales = action.locales;
      break;
    }

    case ADD_LOCALE: {
      if (action.newLocale.isDefault) {
        draftState.locales.forEach((locale) => {
          locale.isDefault = false;
        });
      }

      draftState.locales.push(action.newLocale);
      break;
    }

    case DELETE_LOCALE: {
      const locales = draftState.locales.filter((locale) => locale.id !== action.id);

      set(draftState, 'locales', locales);
      break;
    }

    case UPDATE_LOCALE: {
      if (action.editedLocale.isDefault) {
        draftState.locales.forEach((locale) => {
          locale.isDefault = false;
        });
      }

      const indexToEdit = draftState.locales.findIndex(
        (locale) => locale.id === action.editedLocale.id
      );

      set(draftState.locales, indexToEdit, action.editedLocale);
      break;
    }

    default:
      return draftState;
  }

  return draftState;
});

const reducers = {
  [`${pluginId}_locales`]: localeReducer,
};

export default reducers;
