import { flatMap } from 'lodash';

const generateArrayOfLinks = array => flatMap(array, 'links');

const findFirstAllowedEndpoint = menuArray => {
  const arrayOfLinks = generateArrayOfLinks(menuArray);

  const link = arrayOfLinks.find(link => link.isDisplayed === true);

  return link ? link.to : null;
};

export default findFirstAllowedEndpoint;
export { generateArrayOfLinks };
