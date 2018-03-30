function findLinkEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    return entityKey !== null && contentState.getEntity(entityKey).getType() === 'LINK';
  }, callback);
}

function findImageEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    const { src } = contentState.getEntity(entityKey).getData();

    return entityKey !== null && contentState.getEntity(entityKey).getType() === 'IMAGE' && !isVideoType(src);
  }, callback);
}

function findVideoEntities(contentBlock, cb, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    const { src } = contentState.getEntity(entityKey).getData();

    return entityKey !== null && contentState.getEntity(entityKey).getType() === 'IMAGE' && isVideoType(src);
  }, cb);
}

const isVideoType = (fileName) => /\.(mp4|mpg|mpeg|mov|avi)$/i.test(fileName);

export { findLinkEntities, findImageEntities, findVideoEntities };
