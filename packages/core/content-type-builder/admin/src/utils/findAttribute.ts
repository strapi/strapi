import { AnyAttribute } from '../types';

export const findAttribute = (attributes: AnyAttribute[], attributeToFind: string) => {
  return attributes.find(({ name }) => name === attributeToFind);
};
