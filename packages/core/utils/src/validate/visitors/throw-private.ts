import { isPrivateAttribute } from '../../content-types';
import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ schema, key, attribute }) => {
  if (!attribute) {
    return;
  }

  const isPrivate = attribute.private === true || isPrivateAttribute(schema, key);

  if (isPrivate) {
    throwInvalidParam({ key });
  }
};

export default visitor;
