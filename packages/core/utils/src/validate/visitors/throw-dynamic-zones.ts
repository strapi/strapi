import { isDynamicZoneAttribute } from '../../content-types';
import { ValidationError } from '../../errors';
import { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }) => {
  if (isDynamicZoneAttribute(attribute)) {
    throw new ValidationError(`Invalid parameter ${key}`);
  }
};

export default visitor;
