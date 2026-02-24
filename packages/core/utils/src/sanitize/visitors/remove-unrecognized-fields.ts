import {
  isDynamicZoneAttribute,
  isMorphToRelationalAttribute,
  isRelationalAttribute,
  isComponentSchema,
  isMediaAttribute,
  isComponentAttribute,
  DYNAMIC_ZONE_KEYS,
  ID_FIELDS,
  MORPH_TO_KEYS,
  RELATION_OPERATION_KEYS,
} from '../../content-types';
import type { Visitor } from '../../traverse-entity';

const removeUnrecognizedFields: Visitor = (
  { key, attribute, path, schema, parent, allowedExtraRootKeys },
  { remove }
) => {
  // We only look at properties that are not attributes
  if (attribute) {
    return;
  }

  // At root level (path.attribute === null), only accept id-like fields
  if (path.attribute === null) {
    if (ID_FIELDS.includes(key)) {
      return;
    }
    if (allowedExtraRootKeys?.includes(key)) {
      return;
    }

    remove(key);
    return;
  }

  // allow special morphTo keys
  if (isMorphToRelationalAttribute(parent?.attribute) && MORPH_TO_KEYS.includes(key)) {
    return;
  }

  // allow special dz keys
  if (
    isComponentSchema(schema) &&
    isDynamicZoneAttribute(parent?.attribute) &&
    DYNAMIC_ZONE_KEYS.includes(key)
  ) {
    return;
  }

  // allow relation operation keys (connect, disconnect, set, options) for relations and media
  if (
    (isRelationalAttribute(parent?.attribute) || isMediaAttribute(parent?.attribute)) &&
    RELATION_OPERATION_KEYS.includes(key)
  ) {
    return;
  }

  // allow id fields for relations, media, and components
  const canUseID =
    isRelationalAttribute(parent?.attribute) ||
    isMediaAttribute(parent?.attribute) ||
    isComponentAttribute(parent?.attribute);
  if (canUseID && ID_FIELDS.includes(key)) {
    return;
  }

  // if we couldn't find any reason for it to be here, remove it
  remove(key);
};

export default removeUnrecognizedFields;
