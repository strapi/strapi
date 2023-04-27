import { isMorphToRelationalAttribute } from '../../content-types';
import type { Visitor } from '../../traverse-entity';

const visitor: Visitor = ({ key, attribute }, { remove }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    remove(key);
  }
};

export default visitor;
