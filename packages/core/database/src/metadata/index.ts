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
import type { Model } from '../types';

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
export const createMetadata = (models: Model[]): Metadata => {
  const metadata = new Metadata();

  if (models.length) {
    metadata.loadModels(models);
  }

  return metadata;
};
