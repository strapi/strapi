import {
  TOGGLE_IS_LOADING,
  SET_CT_OR_ST_LINKS,
  SET_SECTION_LINKS,
  UNSET_IS_LOADING,
} from './constants';

export const setCtOrStLinks = (authorizedCtLinks, authorizedStLinks, contentTypeSchemas) => ({
  type: SET_CT_OR_ST_LINKS,
  data: { authorizedCtLinks, authorizedStLinks, contentTypeSchemas },
});

export const setSectionLinks = (authorizedGeneralLinks, authorizedPluginLinks) => ({
  type: SET_SECTION_LINKS,
  data: { authorizedGeneralLinks, authorizedPluginLinks },
});

export const toggleIsLoading = () => ({
  type: TOGGLE_IS_LOADING,
});

export const unsetIsLoading = () => ({
  type: UNSET_IS_LOADING,
});
