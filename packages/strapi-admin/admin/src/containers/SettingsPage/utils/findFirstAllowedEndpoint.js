const generateArrayOfLinks = array => array.map(({ links }) => links).flat();

const findFirstAllowedEndpoint = menuArray => {
  const arrayOfLinks = generateArrayOfLinks(menuArray);

  const link = arrayOfLinks.find(link => link.isDisplayed === true);

  return link ? link.to : null;
};

export default findFirstAllowedEndpoint;
export { generateArrayOfLinks };
