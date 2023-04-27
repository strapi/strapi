import { isDynamicZoneAttribute } from '../../content-types';
import type { Visitor } from '../../traverse-entity';

const visitor: Visitor = ({ key, attribute }, { remove }) => {
  if (isDynamicZoneAttribute(attribute)) {
    remove(key);
  }
};

export default visitor;
