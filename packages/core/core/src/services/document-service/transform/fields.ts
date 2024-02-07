import { errors } from '@strapi/utils';

export const transformFields = (fields: string[]): string[] => {
  if (!fields.includes('id')) {
    throw new errors.ApplicationError('Fields must include "id"');
  }

  return fields.map((field) => (field === 'id' ? 'documentId' : field));
};
