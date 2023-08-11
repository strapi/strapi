import { isMorphToRelationalAttribute } from '../../content-types';
import { ValidationError } from '../../errors';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    throw new ValidationError(`Invalid parameter ${key}`);
  }
};

export default visitor;
