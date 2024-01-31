import { isDynamicZoneAttribute } from '../../content-types';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }, { remove }) => {
  if (attribute && isDynamicZoneAttribute(attribute)) {
    remove(key);
  }
};

export default visitor;
