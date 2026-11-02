import { errors } from '@strapi/utils';

class FolderContainsUnauthorizedAssetsError extends errors.PolicyError<'FolderContainsUnauthorizedAssetsError'> {
  constructor() {
    super('FolderContainsUnauthorizedAssetsError');
  }
}

export { FolderContainsUnauthorizedAssetsError };
