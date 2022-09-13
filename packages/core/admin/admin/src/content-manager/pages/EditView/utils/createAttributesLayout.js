import { get, isEmpty } from 'lodash';
// TODO: refacto this file to avoid eslint issues
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */

const createAttributesLayout = (currentLayout, attributes) => {
  const getType = (name) => get(attributes, [name, 'type'], '');
  let currentRowIndex = 0;
  const newLayout = [];

  for (let row of currentLayout) {
    const hasDynamicZone = row.some(({ name }) => getType(name) === 'dynamiczone');

    if (!newLayout[currentRowIndex]) {
      newLayout[currentRowIndex] = [];
    }

    if (hasDynamicZone) {
      currentRowIndex = currentRowIndex === 0 && isEmpty(newLayout[0]) ? 0 : currentRowIndex + 1;

      if (!newLayout[currentRowIndex]) {
        newLayout[currentRowIndex] = [];
      }
      newLayout[currentRowIndex].push(row);

      currentRowIndex += 1;
    } else {
      newLayout[currentRowIndex].push(row);
    }
  }

  return newLayout.filter((arr) => arr.length > 0);
};

export default createAttributesLayout;
