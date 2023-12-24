import { UPDATE_LINKS, GET_INIT_DATA, RESET_INIT_DATA, SET_INIT_DATA } from './constants';

export const getInitData = () => ({
  type: GET_INIT_DATA,
});

export const resetInitData = () => ({ type: RESET_INIT_DATA });

export const setInitData = ({
  authorizedCollectionTypeLinks,
  authorizedSingleTypeLinks,
  contentTypeSchemas,
  components,
  fieldSizes,
}) => ({
  type: SET_INIT_DATA,
  data: {
    authorizedCollectionTypeLinks,
    authorizedSingleTypeLinks,
    components,
    contentTypeSchemas,
    fieldSizes,
  },
});

export const updateLinksAction = ({
  authorizedCollectionTypeLinks,
  authorizedSingleTypeLinks,
}) => ({
  type: UPDATE_LINKS,
  data: {
    authorizedCollectionTypeLinks,
    authorizedSingleTypeLinks,
  },
});
