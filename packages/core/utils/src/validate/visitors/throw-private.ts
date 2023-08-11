import { isPrivateAttribute } from '../../content-types';
import { ValidationError } from '../../errors';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ schema, key, attribute }) => {
  if (!attribute) {
    return;
  }

  const isPrivate = attribute.private === true || isPrivateAttribute(schema, key);

  if (isPrivate) {
    throw new ValidationError(`Invalid parameter ${key}`);
  }
};

export default visitor;
