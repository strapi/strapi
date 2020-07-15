import { flatten } from 'lodash';

const generateArrayOfLinks = array => flatten(array.map(({ links }) => links));

const findFirstAllowedEndpoint = menuArray => {
  const arrayOfLinks = generateArrayOfLinks(menuArray);

  const link = arrayOfLinks.find(link => link.isDisplayed === true);

  return link ? link.to : null;
};

export default findFirstAllowedEndpoint;
export { generateArrayOfLinks };
