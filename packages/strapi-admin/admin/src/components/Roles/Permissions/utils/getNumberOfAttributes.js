import { getAttributesToDisplay } from '../../../../utils';

const getNumberOfAttributes = (contentTypes, components) => {
  const count = contentTypes.reduce((contentTypeAcc, currentContentType) => {
    const recursiveAttribute = model => {
      const attributeCount = getAttributesToDisplay(model).reduce(
        (attributeAcc, currentAttribute) => {
          if (currentAttribute.type === 'component') {
            const component = components.find(
              component => component.uid === currentAttribute.component
            );

            return recursiveAttribute(component) + attributeAcc + 1;
          }

          return attributeAcc + 1;
        },
        0
      );

      return attributeCount;
    };

    const recursiveCount = recursiveAttribute(currentContentType);

    return recursiveCount + contentTypeAcc;
  }, 0);

  return count;
};

export default getNumberOfAttributes;
