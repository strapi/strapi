import { isMorphToRelationalAttribute } from '../../content-types';
import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }) => {
  if (attribute && isMorphToRelationalAttribute(attribute)) {
    throwInvalidParam({ key });
  }
};

export default visitor;
