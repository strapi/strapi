import { ON_CHANGE, SET_LOADED } from './actionTypes';

export const onChange = ({ name, value }) => ({
  type: ON_CHANGE,
  keys: name,
  value,
});

export const setLoaded = () => ({
  type: SET_LOADED,
});
