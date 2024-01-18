import produce from 'immer';
import set from 'lodash/set';

import { pluginId } from '../pluginId';

import { ADD_LOCALE, DELETE_LOCALE, RESOLVE_LOCALES, UPDATE_LOCALE } from './constants';

import type { Locale } from '../../../shared/contracts/locales';
import type { Store } from '@strapi/strapi/admin';

export interface LocalesState {
  isLoading: boolean;
  locales: Locale[];
}

export const initialState = {
  isLoading: true,
  locales: [],
};

interface ResolveLocalesAction extends Pick<LocalesState, 'locales'> {
  type: typeof RESOLVE_LOCALES;
}

interface AddLocaleAction {
  type: typeof ADD_LOCALE;
  newLocale: LocalesState['locales'][number];
}

interface DeleteLocaleAction {
  type: typeof DELETE_LOCALE;
  id: LocalesState['locales'][number]['id'];
}

interface UpdateLocaleAction {
  type: typeof UPDATE_LOCALE;
  editedLocale: LocalesState['locales'][number];
}

type Action = ResolveLocalesAction | AddLocaleAction | DeleteLocaleAction | UpdateLocaleAction;

const localeReducer = produce((draftState: LocalesState = initialState, action: Action) => {
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

type RootState = ReturnType<Store['getState']> & {
  i18n_locales: LocalesState;
};

export { reducers };
export type { RootState, Locale, Action };
