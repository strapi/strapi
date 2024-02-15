import { isDynamicZoneAttribute } from '../../content-types';
import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute, path }) => {
  if (isDynamicZoneAttribute(attribute)) {
    throwInvalidParam({ key, path: path.attribute });
  }
};

export default visitor;
