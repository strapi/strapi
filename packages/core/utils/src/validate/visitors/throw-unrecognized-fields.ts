import {
  isDynamicZoneAttribute,
  isMorphToRelationalAttribute,
  isRelationalAttribute,
  constants,
  isComponentSchema,
  isMediaAttribute,
  hasRelationReordering,
} from '../../content-types';
import type { Visitor } from '../../traverse-entity';
import { throwInvalidKey } from '../utils';

// TODO these should all be centralized somewhere instead of maintaining a list
const ID_FIELDS = [constants.DOC_ID_ATTRIBUTE, constants.DOC_ID_ATTRIBUTE];
const ALLOWED_ROOT_LEVEL_FIELDS = [...ID_FIELDS];
const MORPH_TO_ALLOWED_FIELDS = ['__type'];
const DYNAMIC_ZONE_ALLOWED_FIELDS = ['__component'];
const RELATION_REORDERING_FIELDS = ['connect', 'disconnect', 'set', 'options'];

const throwUnrecognizedFields: Visitor = ({ key, attribute, path, schema, parent }) => {
  // We only look at properties that are not attributes
  if (attribute) {
    return;
  }

  // At root level (path.attribute === null), only accept allowed fields
  if (path.attribute === null) {
    if (ALLOWED_ROOT_LEVEL_FIELDS.includes(key)) {
      return;
    }

    return throwInvalidKey({ key, path: attribute });
  }

  // allow special morphTo keys
  if (isMorphToRelationalAttribute(parent?.attribute) && MORPH_TO_ALLOWED_FIELDS.includes(key)) {
    return;
  }

  // allow special dz keys
  if (
    isComponentSchema(schema) &&
    isDynamicZoneAttribute(parent?.attribute) &&
    DYNAMIC_ZONE_ALLOWED_FIELDS.includes(key)
  ) {
    return;
  }

  // allow special relation reordering keys in manyToX and XtoMany relations
  if (hasRelationReordering(parent?.attribute) && RELATION_REORDERING_FIELDS.includes(key)) {
    return;
  }

  // allow id fields where it is needed for setting a relational id rather than trying to create with a given id
  const canUseID = isRelationalAttribute(parent?.attribute) || isMediaAttribute(parent?.attribute);
  if (canUseID && !ID_FIELDS.includes(key)) {
    return;
  }

  // if we couldn't find any reason for it to be here, throw
  throwInvalidKey({ key, path: attribute });
};

export default throwUnrecognizedFields;
