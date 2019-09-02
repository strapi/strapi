import { List } from 'immutable';
import { flattenDeep, get, range } from 'lodash';
import { Manager } from 'strapi-helper-plugin';

/**
 * Update an object with new data
 * @param {fromJS} obj
 * @param {List} array
 * @param {String} keys
 */
const stateUpdater = (obj, array, keys) =>
  obj.updateIn(
    ['modifiedSchema', 'models', ...keys.split('.'), 'fields'],
    () => array,
  );

/**
 * Create a Manager class
 * @param {fromJS} obj
 * @param {List} array
 * @param {String} keys
 * @param {Number} dropIndex
 * @param {Map || Object} layout
 */
const createManager = (obj, array, keys, dropIndex, layout) =>
  new Manager(stateUpdater(obj, array, keys), array, keys, dropIndex, layout);

/**
 * Retrieve the elements of a line from the bootstrap grid
 * @param {Class} manager
 * @param {Number} line
 * @param {List} list
 */
const getElementsOnALine = (manager, line, list) => {
  const firstElIndex =
    line === 0
      ? 0
      : get(manager.arrayOfEndLineElements[line - 1], 'index', list.size - 1) +
        1;
  const lastElIndex =
    get(manager.arrayOfEndLineElements[line], 'index', list.size - 1) + 1;
  const elements = manager.getElementsOnALine(range(firstElIndex, lastElIndex));

  return { elements, lastElIndex };
};

/**
 * Retrieve the last elements of each line of a bootstrap grid
 * @param {Class} manager
 * @param {List} list
 */
const createArrayOfLastEls = (manager, list) => {
  const { name, index, bootstrapCol } = manager.getAttrInfos(list.size - 1);
  const isFullSize = bootstrapCol === 12;

  return manager.arrayOfEndLineElements.concat({ name, index, isFullSize });
};

/**
 * Remove each line composed of added elements that keeps the layout organised
 * A line may look like this [__col-md-4, __col-md-4, __col-md_4]
 * @param {Class} manager
 * @param {List} list
 * @returns {List}
 */
const removeColsLine = (manager, list) => {
  let addedElsToRemove = [];
  const arrayOfEndLineElements = createArrayOfLastEls(manager, list);

  arrayOfEndLineElements.forEach((item, i) => {
    if (i < arrayOfEndLineElements.length) {
      const firstElementOnLine =
        i === 0 ? 0 : arrayOfEndLineElements[i - 1].index + 1;
      const lastElementOnLine = arrayOfEndLineElements[i].index;
      const rangeIndex = range(firstElementOnLine, lastElementOnLine + 1);
      const elementsOnLine = manager
        .getElementsOnALine(rangeIndex)
        .filter(name => !name.includes('__col'));

      if (elementsOnLine.length === 0) {
        addedElsToRemove = addedElsToRemove.concat(rangeIndex);
      }
    }
  });

  return list.filter((item, index) => {
    const indexToKeep = addedElsToRemove.indexOf(index) === -1;

    return indexToKeep;
  });
};

/**
 * Make sure each line of the bootstrap ends with the added elements (__col-md-something) so we can't have blank space at the begining of a line
 * These method also ensure we have unique added element name
 * @param {Class} manager
 * @param {List} list
 */
const reorderList = (manager, list) => {
  const lines = getLines(manager, list);
  const reordered = lines
    .reduce((acc, curr) => {
      const line = curr.reduce(
        (acc, current, index) => {
          if (current && current.includes('__col-md')) {
            acc.splice(index, 1);
            acc.splice(curr.length - 1, 0, current);
          }

          return acc;
        },
        [...curr],
      );

      return acc.concat(line);
    }, [])
    .filter(a => a !== undefined);

  // Make sure each added element is unique by name since the name of an element is used as key in the rdnd container
  const uniqueIdList = reordered.reduce((acc, current, index) => {
    if (reordered.indexOf(current) === index) {
      acc.push(current);
    } else {
      const bootstrapCol = parseInt(current.split('__')[1].split('-')[2], 10);
      const random = Math.random()
        .toString(36)
        .substring(7);
      acc.push(`__col-md-${bootstrapCol}__${random}`);
    }

    return acc;
  }, []);

  return List(flattenDeep(uniqueIdList));
};

/**
 * Retrieve the elements displayed on each line of the bootstrap grid
 * @param {Class} manager
 * @param {List} list
 * @returns {Array}
 */
const getLines = (manager, list) => {
  const array = createArrayOfLastEls(manager, list);
  const lines = [];

  array.forEach((item, i) => {
    const { elements } = getElementsOnALine(manager, i, list);
    lines.push(elements);
  });

  return lines;
};

export {
  createArrayOfLastEls,
  createManager,
  getElementsOnALine,
  getLines,
  removeColsLine,
  reorderList,
};
