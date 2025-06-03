import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ key, attribute }, { remove }) => {
  if (attribute?.type === 'password') {
    remove(key);
  }
};

export default visitor;
