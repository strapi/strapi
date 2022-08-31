import { getRequestUrl } from '../../../utils';

export function getRelationLink(targetModel, id) {
  return `/admin${getRequestUrl(`collectionType/${targetModel}/${id ?? ''}`)}`;
}
