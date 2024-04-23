import type { Visitor } from '../../traverse/factory';
import { throwInvalidParam } from '../utils';

const throwUnrecognizedFields: Visitor = ({ key, attribute }) => {
  // TODO: handle these appropriately
  if (
    [
      'connect',
      'disconnect',
      'set',
      '__component',
      '__type',
      'options',
      'id',
      'document_id',
    ].includes(key)
  ) {
    return;
  }

  if (!attribute) {
    throwInvalidParam({ key, path: attribute });
  }
};

export default throwUnrecognizedFields;
