import { SET_FILE_MODE_TIMESTAMPS } from './constants';

// eslint-disable-next-line import/prefer-default-export
export const setFileModelTimestamps = timestamps => {
  return { type: SET_FILE_MODE_TIMESTAMPS, timestamps };
};
