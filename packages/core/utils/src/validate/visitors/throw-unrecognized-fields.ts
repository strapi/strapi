import type { Visitor } from '../../traverse/factory';
import { throwInvalidParam } from '../utils';

const throwUnrecognizedFields: Visitor = ({ key, attribute }) => {
  // TODO: only allow these in the appropriate place
  if (['connect', 'disconnect', 'set', '__component', '__type', 'options'].includes(key)) {
    return;
  }

  if (!attribute) {
    throwInvalidParam({ key, path: attribute });
  }
};

export default throwUnrecognizedFields;
