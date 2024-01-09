import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }) => {
  if (attribute?.type === 'password') {
    throwInvalidParam({ key });
  }
};

export default visitor;
