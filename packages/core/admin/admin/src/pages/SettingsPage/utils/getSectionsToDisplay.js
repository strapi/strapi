const getSectionsToDisplay = (menu) => {
  return menu.filter((section) => !section.links.every((link) => link.isDisplayed === false));
};

export default getSectionsToDisplay;
