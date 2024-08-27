import { ON_CHANGE, SET_LOADED } from './actionTypes';

interface OnChangeProps {
  name: string;
  value: number;
}

export const onChange = ({ name, value }: OnChangeProps) => ({
  type: ON_CHANGE,
  keys: name,
  value,
});

export const setLoaded = () => ({
  type: SET_LOADED,
});
