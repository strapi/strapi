import { isPrivateAttribute } from '../../content-types';
import type { Visitor } from '../../traverse-entity';

const visitor: Visitor = ({ schema, key, attribute }, { remove }) => {
  if (!attribute) {
    return;
  }

  const isPrivate = isPrivateAttribute(schema, key) || attribute.private === true;

  if (isPrivate) {
    remove(key);
  }
};

export default visitor;
