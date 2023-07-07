import produce from 'immer';
import set from 'lodash/set';

import pluginId from '../pluginId';

import {
  ADD_LOCALE,
  DELETE_LOCALE,
  RESOLVE_LOCALES,
  UPDATE_LOCALE,
  SET_PREFERRED_LOCALE,
} from './constants';

const PREFERRED_LOCALE_KEY = `${pluginId}_preferredLocale`;

export const initialState = {
  isLoading: true,
  locales: [],
  preferredLocale: sessionStorage.getItem(PREFERRED_LOCALE_KEY)
    ? JSON.parse(sessionStorage.getItem(PREFERRED_LOCALE_KEY))
    : null,
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

    case SET_PREFERRED_LOCALE: {
      if (action.preferredLocale) {
        sessionStorage.setItem(PREFERRED_LOCALE_KEY, JSON.stringify(action.preferredLocale));
      } else {
        sessionStorage.removeItem(PREFERRED_LOCALE_KEY);
      }
      draftState.preferredLocale = action.preferredLocale;
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
