import { RelationData } from '../../EditViewDataManagerProvider/reducer';

export const diffRelations = (
  browserStateRelations: RelationData[] = [],
  serverStateRelations: RelationData[] = []
): [connected: RelationData['id'][], disconnected: RelationData['id'][]] => {
  const connected = browserStateRelations.reduce<RelationData['id'][]>((acc, relation) => {
    if (!serverStateRelations.find((oldRelation) => oldRelation.id === relation.id)) {
      return [...acc, relation.id];
    }

    return acc;
  }, []);

  const disconnected = serverStateRelations.reduce<RelationData['id'][]>((acc, relation) => {
    if (!browserStateRelations.find((oldRelation) => oldRelation.id === relation.id)) {
      return [...acc, relation.id];
    }

    return acc;
  }, []);

  return [connected, disconnected];
};
