import {
  isPolymorphic,
  isBidirectional,
  isAnyToOne,
  isOneToAny,
  hasOrderColumn,
  hasInverseOrderColumn,
  isManyToAny,
} from './relations';
import { Metadata, Meta } from './metadata';

export type { Metadata, Meta };
export {
  isPolymorphic,
  isBidirectional,
  isAnyToOne,
  isOneToAny,
  hasOrderColumn,
  hasInverseOrderColumn,
  isManyToAny,
};

// TODO: check if there isn't an attribute with an id already
/**
 * Create Metadata from models configurations
 */
export const createMetadata = (): Metadata => {
  return new Metadata();
};
