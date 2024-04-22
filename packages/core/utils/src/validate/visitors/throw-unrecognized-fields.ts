import type { Visitor } from '../../traverse/factory';
import { throwInvalidParam } from '../utils';

const throwUnrecognizedFields: Visitor = ({ key, attribute }) => {
  if (!attribute) {
    throwInvalidParam({ key, path: attribute });
  }
};

export default throwUnrecognizedFields;
