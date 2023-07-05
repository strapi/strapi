import { isPrivateAttribute } from '../../content-types';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ schema, key, attribute }, { remove }) => {
  if (!attribute) {
    return;
  }

  const isPrivate = attribute.private === true || isPrivateAttribute(schema, key);

  if (isPrivate) {
    remove(key);
  }
};

export default visitor;
