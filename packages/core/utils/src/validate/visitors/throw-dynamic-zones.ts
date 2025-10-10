import { isDynamicZoneAttribute } from '../../content-types';
import { throwInvalidKey } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute, path }) => {
  if (isDynamicZoneAttribute(attribute)) {
    throwInvalidKey({ key, path: path.attribute });
  }
};

export default visitor;
