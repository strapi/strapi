import { ContentType } from '../../../types';

export const createDataObject = (arr: ContentType[]) =>
  arr.reduce((acc: Record<string, ContentType>, current) => {
    acc[current.uid!] = current;

    return acc;
  }, {});
