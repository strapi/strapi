const isAllowedContentTypesForRelations = contentType => {
  return (
    contentType.kind === 'collectionType' &&
    (contentType.restrictRelationsTo === null ||
      (Array.isArray(contentType.restrictRelationsTo) &&
        contentType.restrictRelationsTo.length > 0))
  );
};

export default isAllowedContentTypesForRelations;
