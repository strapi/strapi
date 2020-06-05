import { get } from 'lodash';

const getAttributesToDisplay = (plugins, attributes) => {
  const timestamps = get(
    plugins,
    ['upload', 'fileModel', 'schema', 'options', 'timestamps'],
    ['created_at', 'updated_at']
  );
  const matchingAttributes = Object.keys(attributes).filter(
    attribute => !['id', ...timestamps].includes(attribute)
  );
  const attributesToDisplay = matchingAttributes.map(attributeName => ({
    ...attributes[attributeName],
    attributeName,
  }));

  return attributesToDisplay;
};

export default getAttributesToDisplay;
