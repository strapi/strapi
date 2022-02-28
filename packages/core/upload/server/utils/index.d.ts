import * as upload from '../services/upload';
import * as imageManipulation from '../services/image-manipulation';

type S = {
  upload: typeof upload;
  ['image-manipulation']: typeof imageManipulation;
};

export function getService<T extends keyof S>(name: T): ReturnType<S[T]>;
