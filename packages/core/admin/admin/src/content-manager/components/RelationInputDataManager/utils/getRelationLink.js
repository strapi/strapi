export function getRelationLink(targetModel, id) {
  return `/content-manager/collectionType/${targetModel}/${id ?? ''}`;
}
