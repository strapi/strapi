const selectMenuLinks = (state) => {
  const cmState = state['content-manager_app'];

  return cmState.collectionTypeLinks;
};

export default selectMenuLinks;
