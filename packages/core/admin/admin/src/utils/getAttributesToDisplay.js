import { get } from 'lodash';

const getAttributesToDisplay = (contentType) => {
  const timestamps = get(contentType, ['options', 'timestamps']);

  // Sometimes timestamps is false
  let timestampsArray = Array.isArray(timestamps) ? timestamps : [];
  const idsAttributes = ['id', '_id']; // For both SQL and mongo
  const unwritableAttributes = [...idsAttributes, ...timestampsArray, 'publishedAt'];
  const schemaAttributes = get(contentType, ['attributes'], {});

  return Object.keys(schemaAttributes).reduce((acc, current) => {
    if (!unwritableAttributes.includes(current)) {
      acc.push({ ...schemaAttributes[current], attributeName: current });
    }

    return acc;
  }, []);
};

export default getAttributesToDisplay;
