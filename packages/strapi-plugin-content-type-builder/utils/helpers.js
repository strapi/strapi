const { List } = require('immutable');
const { flattenDeep, get, range } = require('lodash');
const Manager = require('./Manager');

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
  const array = createArrayOfLastEls(manager, list);
  const lines = [];

  array.forEach((item, i) => {
    const { elements } = getElementsOnALine(manager, i, list);
    lines.push(elements);
  });

  const reordered = lines
    .reduce((acc, curr) => {
      const line = curr.sort((a) => a.includes('__col-md'));

      return acc.concat(line);
    }, [])
    .filter(a => a !== undefined);

  return List(flattenDeep(reordered));
};

const escapeNewlines = (content = '', placeholder = '\n') => {
  return content.replace(/[\r\n]+/g, placeholder);
};

const deepTrimObject = attribute => {
  if (Array.isArray(attribute)) {
    return attribute.map(deepTrimObject);
  }

  if (typeof attribute === 'object') {
    return Object.entries(attribute)
      .reduce((acc, [key, value]) => {
        const trimmedObject = deepTrimObject(value);

        return { ...acc, [key]: trimmedObject };
      }, {});
  }

  return typeof attribute === 'string'
    ? attribute.trim()
    : attribute;
}

module.exports = {
  createArrayOfLastEls,
  createManager,
  getElementsOnALine,
  removeColsLine,
  reorderList,
  escapeNewlines,
  deepTrimObject
};
