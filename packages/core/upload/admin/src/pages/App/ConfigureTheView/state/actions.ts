import type { InitialState } from './init';
import { ON_CHANGE, SET_LOADED } from './actionTypes';

export const onChange = ({
  name,
  value,
}: {
  name: keyof NonNullable<InitialState['initialData']>;
  value: number | string;
}) => ({
  type: ON_CHANGE,
  keys: name,
  value,
});

export const setLoaded = () => ({
  type: SET_LOADED,
});
