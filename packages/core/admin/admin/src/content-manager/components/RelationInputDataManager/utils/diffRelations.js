/**
 * @param {Array<{id: string}>} browserStateRelations
 * @param {Array<{id: string}>} serverStateRelations
 * @returns {[connected: string[], disconnected: string[]]} – the connected and disconnected relations ids
 */
export const diffRelations = (browserStateRelations = [], serverStateRelations = []) => {
  const currentRelations = browserStateRelations.map((relation) => relation.id);
  const oldRelations = serverStateRelations.map((relation) => relation.id);

  const connected = currentRelations.filter((relation) => !oldRelations.includes(relation));
  const disconnected = oldRelations.filter((relation) => !currentRelations.includes(relation));

  return [connected, disconnected];
};
