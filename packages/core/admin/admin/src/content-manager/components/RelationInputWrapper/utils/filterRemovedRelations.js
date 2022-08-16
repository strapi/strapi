function isMarkedForDeletion(entity, removals) {
  const { id } = entity;

  return !!removals.find((removal) => removal.id === id);
}

export const filterRemovedRelations = (relations, modifiedFieldData) => {
  if (!modifiedFieldData?.remove) {
    return relations;
  }

  return {
    data: {
      pages: relations.data.pages
        .map((page) =>
          page.filter((entity) => !isMarkedForDeletion(entity, modifiedFieldData.remove))
        )
        .filter((page) => page.length > 0),
    },
  };
};
