/* eslint-disable no-unused-vars */

function findLinkEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    return entityKey !== null && contentState.getEntity(entityKey).getType() === 'LINK';
  }, callback);
}

function findAtomicEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    return entityKey !== null && contentBlock.getType() === 'atomic';
  }, callback);
}

function findImageEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();

    return entityKey !== null && contentState.getEntity(entityKey).getType() === 'IMAGE' && !isVideoType(contentState.getEntity(entityKey).getData().src);
  }, callback);
}

function findVideoEntities(contentBlock, cb, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();

    return entityKey !== null && contentState.getEntity(entityKey).getType() === 'IMAGE' && isVideoType(contentState.getEntity(entityKey).getData().src);
  }, cb);
}

const isVideoType = (fileName) => /\.(mp4|mpg|mpeg|mov|avi)$/i.test(fileName);

export { findAtomicEntities, findLinkEntities, findImageEntities, findVideoEntities };
