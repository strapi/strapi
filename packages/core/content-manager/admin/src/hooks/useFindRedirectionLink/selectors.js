import pluginId from '../../pluginId';

const selectMenuLinks = state => {
  const cmState = state[`${pluginId}_app`];

  return cmState.collectionTypeLinks;
};

export default selectMenuLinks;
