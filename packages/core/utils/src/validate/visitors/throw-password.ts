import { ValidationError } from '../../errors';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }) => {
  if (attribute?.type === 'password') {
    throw new ValidationError(`Invalid parameter ${key}`);
  }
};

export default visitor;
