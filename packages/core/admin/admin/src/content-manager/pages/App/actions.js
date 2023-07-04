import { GET_INIT_DATA, RESET_INIT_DATA, SET_INIT_DATA, SET_LINK_DATA } from './constants';

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

export const setLinkData = ({ authorizedCollectionTypeLinks, authorizedSingleTypeLinks }) => ({
  type: SET_LINK_DATA,
  data: {
    authorizedCollectionTypeLinks,
    authorizedSingleTypeLinks,
  },
});
