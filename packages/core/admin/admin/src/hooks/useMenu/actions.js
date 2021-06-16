import { SET_SECTION_LINKS, UNSET_IS_LOADING } from './constants';

export const setSectionLinks = (authorizedGeneralLinks, authorizedPluginLinks) => ({
  type: SET_SECTION_LINKS,
  data: { authorizedGeneralLinks, authorizedPluginLinks },
});

export const unsetIsLoading = () => ({
  type: UNSET_IS_LOADING,
});
