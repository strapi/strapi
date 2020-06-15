const generateArrayOfLinks = object => object.map(({ links }) => links).flat();

const findFirstAllowedEndpoint = menuObject => {
  console.log({ menuObject });
  const arrayOfLinks = generateArrayOfLinks(menuObject);

  const link = arrayOfLinks.find(link => link.isDisplayed === true);

  return link ? link.to : null;
};

export default findFirstAllowedEndpoint;
export { generateArrayOfLinks };
