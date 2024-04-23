import {
  isDynamicZoneAttribute,
  isMorphToRelationalAttribute,
  isRelationalAttribute,
} from '../../content-types';
import type { Visitor } from '../../traverse/factory';
import { throwInvalidParam } from '../utils';

// TODO replace with imported constants
const CONSTANT_FIELDS = ['id', 'document_id'];
const MORPH_TO_ALLOWED_FIELDS = ['__type'];
const DYNAMIC_ZONE_ALLOWED_FIELDS = ['__component'];
const RELATION_REORDERING_FIELDS = ['connect', 'disconnect', 'set', 'options'];

const throwUnrecognizedFields: Visitor = ({ key, attribute, path, schema }) => {
  // We only look at properties that are not attributes
  if (attribute) {
    return;
  }

  // At root level (path.attribute === null), only accept allowed fields
  if (path.attribute === null) {
    if (CONSTANT_FIELDS.includes(key)) {
      return;
    }

    return throwInvalidParam({ key, path: attribute });
  }

  const closestAttribute = schema.attributes[path.attribute];

  // allow special morphTo keys
  if (isMorphToRelationalAttribute(closestAttribute) && MORPH_TO_ALLOWED_FIELDS.includes(key)) {
    return;
  }

  // allow special dz keys
  if (isDynamicZoneAttribute(closestAttribute) && DYNAMIC_ZONE_ALLOWED_FIELDS.includes(key)) {
    return;
  }

  // allow special relation reordering keys
  // TODO: Only toMany or all?
  if (isRelationalAttribute(closestAttribute) && RELATION_REORDERING_FIELDS.includes(key)) {
    return;
  }

  // allow id fields (since we're not at the root level)
  if (isRelationalAttribute(closestAttribute) && !CONSTANT_FIELDS.includes(key)) {
    return;
  }

  // if we couldn't find any reason for it to be here, throw
  throwInvalidParam({ key, path: attribute });
};

export default throwUnrecognizedFields;
