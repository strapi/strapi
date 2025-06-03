import { isPrivateAttribute } from '../../content-types';
import { throwInvalidKey } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ schema, key, attribute, path }) => {
  if (!attribute) {
    return;
  }

  const isPrivate = attribute.private === true || isPrivateAttribute(schema, key);

  if (isPrivate) {
    throwInvalidKey({ key, path: path.attribute });
  }
};

export default visitor;
