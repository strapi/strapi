import pluginId from './pluginId';
import { LOAD_LOCALES, RESOLVE_LOCALES } from './constants';

const initialState = {
  isLoading: false,
  locales: [],
};

const localeReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_LOCALES:
      return { ...state, isLoading: true };

    case RESOLVE_LOCALES:
      return { ...state, isLoading: false, locales: action.locales };

    default:
      return state;
  }
};

const reducers = {
  [`${pluginId}_locales`]: localeReducer,
};

export default reducers;
