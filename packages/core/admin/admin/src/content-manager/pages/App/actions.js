import { GET_INIT_DATA, RESET_INIT_DATA, SET_INIT_DATA } from './constants';

export const getInitData = () => ({
  type: GET_INIT_DATA,
});

export const resetInitData = () => ({ type: RESET_INIT_DATA });

export const setInitData = ({
  authorizedCtLinks,
  authorizedStLinks,
  contentTypeSchemas,
  components,
  fieldSizes,
}) => ({
  type: SET_INIT_DATA,
  data: { authorizedCtLinks, authorizedStLinks, components, contentTypeSchemas, fieldSizes },
});
