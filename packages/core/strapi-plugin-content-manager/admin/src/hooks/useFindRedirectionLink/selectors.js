const selectMenuLinks = state => {
  const menuState = state.get('menu');

  return menuState.collectionTypesSectionLinks;
};

export default selectMenuLinks;
