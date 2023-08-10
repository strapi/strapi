import { isDynamicZoneAttribute } from '../../content-types';
import { Visitor } from '../factory';

const visitor: Visitor = ({ key, attribute }, { remove }) => {
  if (isDynamicZoneAttribute(attribute)) {
    remove(key);
  }
};

export default visitor;
