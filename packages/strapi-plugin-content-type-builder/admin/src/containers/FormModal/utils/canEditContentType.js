import { get } from 'lodash';

const canEditContentType = (data, modifiedData) => {
  const kind = get(data, ['contentType', 'schema', 'kind'], '');

  // if kind isn't modified or content type is a single type, there is no need to check attributes.
  if (kind === 'singleType' || kind === modifiedData.kind) {
    return true;
  }

  const contentTypeAttributes = get(
    data,
    ['contentType', 'schema', 'attributes'],
    ''
  );
  const relationAttributes = Object.values(contentTypeAttributes).filter(
    ({ nature }) => nature && !['oneWay', 'manyWay'].includes(nature)
  );

  return relationAttributes.length === 0;
};

export default canEditContentType;
