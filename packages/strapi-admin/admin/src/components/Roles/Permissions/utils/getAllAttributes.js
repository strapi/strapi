import getAttributesByModel from './getAttributesByModel';

const getAllAttributes = (contentTypes, components) => {
  const allAttributes = contentTypes.reduce((contentTypeAcc, currentContentType) => {
    const currentContentTypeAttributes = getAttributesByModel(currentContentType, components);

    return [...contentTypeAcc, ...currentContentTypeAttributes];
  }, []);

  return allAttributes;
};

export default getAllAttributes;
