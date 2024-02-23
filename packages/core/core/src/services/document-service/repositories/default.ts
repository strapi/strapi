import { type RepositoryFactoryMethod } from '../common';
import { createCollectionTypeRepository } from './collection-type';

/**
 * Creates a default implementation for the document service,
 * based on the collection type repository, which will be a bit more permissive and unsafe.
 * But it improves DX by exposing a simpler API, that doesn't require to know the type of the content type.
 *
 * TODO: Prevent mutating single types into a bad state
 */
export const createDefaultRepository: RepositoryFactoryMethod = (uid) => {
  const defaultRepository = createCollectionTypeRepository(uid);
  return defaultRepository;
};
