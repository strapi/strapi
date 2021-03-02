import pluginId from './pluginId';
import {
  LOAD_LOCALES,
  RESOLVE_LOCALES,
  ADD_LOCALE,
  DELETE_LOCALE,
  UPDATE_LOCALE,
} from './constants';

const initialState = {
  isLoading: false,
  isAdding: false,
  locales: [],
};

const localeReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_LOCALES:
      return { ...state, isLoading: true };

    case RESOLVE_LOCALES:
      return { ...state, isLoading: false, locales: action.locales };

    case ADD_LOCALE:
      return { ...state, isLoading: false, locales: [...state.locales, action.newLocale] };

    case DELETE_LOCALE: {
      const locales = state.locales.filter(locale => locale.id !== action.id);

      return { ...state, locales };
    }

    case UPDATE_LOCALE: {
      const locales = action.editedLocale.isDefault
        ? state.locales.map(locale => ({ ...locale, isDefault: false }))
        : state.locales;

      const indexToEdit = locales.findIndex(locale => locale.id === action.editedLocale.id);
      const prevArray = locales.slice(0, indexToEdit);
      const afterArray = locales.slice(indexToEdit + 1);

      return { ...state, locales: [...prevArray, action.editedLocale, ...afterArray] };
    }

    default:
      return state;
  }
};

const reducers = {
  [`${pluginId}_locales`]: localeReducer,
};

export default reducers;
