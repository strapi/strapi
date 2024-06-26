import { AttributeType } from '../types';

export const findAttribute = (attributes: AttributeType[], attributeToFind: string) => {
  return attributes.find(({ name }) => name === attributeToFind);
};
