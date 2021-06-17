import { GET_DATA, RESET_PROPS, SET_CONTENT_TYPE_LINKS } from './constants';

export const getData = () => ({
  type: GET_DATA,
});

export const resetProps = () => ({ type: RESET_PROPS });

export const setContentTypeLinks = (authorizedCtLinks, authorizedStLinks, models, components) => ({
  type: SET_CONTENT_TYPE_LINKS,
  data: { authorizedCtLinks, authorizedStLinks, components, contentTypeSchemas: models },
});
