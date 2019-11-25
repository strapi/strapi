import { get } from 'lodash';

const retrieveCategoriesFromComponents = allComponents => {
  const allCategories = Object.keys(allComponents).map(compo => {
    return get(allComponents, [compo, 'category'], '');
  });

  return allCategories.filter((category, index) => {
    return category !== '' && allCategories.indexOf(category) === index;
  });
};

export default retrieveCategoriesFromComponents;
