import { throwInvalidKey } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute, path }) => {
  if (attribute?.type === 'password') {
    throwInvalidKey({ key, path: path.attribute });
  }
};

export default visitor;
