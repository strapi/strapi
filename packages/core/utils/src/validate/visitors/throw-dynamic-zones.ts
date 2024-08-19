import { isDynamicZoneAttribute } from '../../content-types';
import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }) => {
  if (isDynamicZoneAttribute(attribute)) {
    throwInvalidParam({ key });
  }
};

export default visitor;
