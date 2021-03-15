import { GET_MODELS_SUCCEEDED, SET_LINK_PERMISSIONS, TOGGLE_IS_LOADING } from './constants';

export const getModelsSucceeded = models => ({
  type: GET_MODELS_SUCCEEDED,
  data: models,
});

export const setLinkPermissions = data => ({
  type: SET_LINK_PERMISSIONS,
  data,
});

export const toggleIsLoading = () => ({
  type: TOGGLE_IS_LOADING,
});
