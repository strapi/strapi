import { isMorphToRelationalAttribute } from '../../content-types';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }, { remove }) => {
  if (attribute && isMorphToRelationalAttribute(attribute)) {
    remove(key);
  }
};

export default visitor;
