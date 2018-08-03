import { List } from 'immutable';
import { flattenDeep, get, range } from 'lodash';
import Manager from 'utils/Manager';

const stateUpdater = (obj, array, keys) => obj.updateIn(['modifiedSchema', 'models', ...keys.split('.'), 'fields'], () => array);
const createManager = (obj, array, keys, dropIndex, layout) => new Manager(stateUpdater(obj, array, keys), array, keys, dropIndex, layout);
const getElementsOnALine = (manager, line, list) => {
  const firstElIndex = line === 0 ? 0 : manager.arrayOfEndLineElements[line - 1].index + 1;
  const lastElIndex = get(manager.arrayOfEndLineElements[line], 'index', list.size -1) + 1;
  const elements = manager.getElementsOnALine(range(firstElIndex, lastElIndex));

  return { elements, lastElIndex };
};
const createArrayOfLastEls = (manager, list) => {
  const { name, index, bootstrapCol } = manager.getAttrInfos(list.size - 1);
  const isFullSize = bootstrapCol === 12;

  return manager.arrayOfEndLineElements.concat({ name, index, isFullSize });
};
const removeColsLine = (manager, list) => {
  let addedElsToRemove = [];
  const arrayOfEndLineElements = createArrayOfLastEls(manager, list);

  arrayOfEndLineElements.forEach((item, i) => {
    if (i < arrayOfEndLineElements.length) {
      const firstElementOnLine = i === 0 ? 0 : arrayOfEndLineElements[i - 1].index + 1;
      const lastElementOnLine = arrayOfEndLineElements[i].index;
      const rangeIndex = range(firstElementOnLine, lastElementOnLine + 1);
      const elementsOnLine = manager.getElementsOnALine(rangeIndex)
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
const reorderList = (manager, list) => {
  const lines = getLines(manager, list);
  const reordered = lines
    .reduce((acc, curr) => {
      const line = curr.reduce((acc, current, index) => {
        if (current.includes('__col-md')) {
          acc.splice(index, 1);
          acc.splice(curr.length -1, 0, current);
        }

        return acc;
      }, [...curr]);

      return acc.concat(line);
    }, [])
    .filter(a => a !== undefined);
  
  const uniqueIdList = reordered.reduce((acc, current, index) => {
    if (reordered.indexOf(current) === index) {
      acc.push(current);
    } else {
      const bootstrapCol =  parseInt(current.split('__')[1].split('-')[2], 10);
      const random = Math.random().toString(36).substring(7);
      acc.push(`__col-md-${bootstrapCol}__${random}`);
    }

    return acc;
  }, []);

  return List(flattenDeep(uniqueIdList));
};
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