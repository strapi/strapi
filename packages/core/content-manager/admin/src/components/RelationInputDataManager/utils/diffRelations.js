/**
 * @param {Array<{id: string}>} browserStateRelations
 * @param {Array<{id: string}>} serverStateRelations
 * @returns {[connected: string[], disconnected: string[]]} – the connected and disconnected relations ids
 */
export const diffRelations = (browserStateRelations = [], serverStateRelations = []) => {
  const connected = browserStateRelations.reduce((acc, relation) => {
    if (!serverStateRelations.find((oldRelation) => oldRelation.id === relation.id)) {
      return [...acc, relation.id];
    }

    return acc;
  }, []);

  const disconnected = serverStateRelations.reduce((acc, relation) => {
    if (!browserStateRelations.find((oldRelation) => oldRelation.id === relation.id)) {
      return [...acc, relation.id];
    }

    return acc;
  }, []);

  return [connected, disconnected];
};
