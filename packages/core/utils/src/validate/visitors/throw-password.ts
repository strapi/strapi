import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute, path }) => {
  if (attribute?.type === 'password') {
    throwInvalidParam({ key, path: path.attribute });
  }
};

export default visitor;
