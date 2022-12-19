import { SET_LOADED, ON_CHANGE } from './actionTypes';

export const onChange = ({ name, value }) => ({
  type: ON_CHANGE,
  keys: name,
  value,
});

export const setLoaded = () => ({
  type: SET_LOADED,
});
