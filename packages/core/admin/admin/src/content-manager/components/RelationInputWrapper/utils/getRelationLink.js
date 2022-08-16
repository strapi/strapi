import { getRequestUrl } from '../../../utils';

export function getRelationLink(targetModel, id) {
  return getRequestUrl(`collectionType/${targetModel}/${id ?? ''}`);
}
