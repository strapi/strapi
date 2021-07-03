import { TOGGLE_IS_LOADING, SET_SECTION_LINKS, UNSET_IS_LOADING } from './constants';

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
