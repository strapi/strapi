import type { Data } from '@strapi/types';

interface RelationData {
  id: Data.ID;
  __temp_key__: number;
}

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
