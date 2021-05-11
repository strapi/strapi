const selectMenuLinks = state => {
  const menuState = state.menu;

  return menuState.collectionTypesSectionLinks;
};

export default selectMenuLinks;
