import { get } from 'lodash';

const getAttributesToDisplay = contentType => {
  const timestamps = get(contentType, ['schema', 'options', 'timestamps']);

  // Sometimes timestamps is false
  let timestampsArray = Array.isArray(timestamps) ? timestamps : [];
  const idsAttributes = ['id', '_id']; // For both SQL and mongo
  const schemaAttributes = get(contentType, ['schema', 'attributes'], {});

  return Object.keys(schemaAttributes).reduce((acc, current) => {
    if (![...idsAttributes, ...timestampsArray].includes(current)) {
      acc.push({ ...schemaAttributes[current], attributeName: current });
    }

    return acc;
  }, []);
};

export default getAttributesToDisplay;
