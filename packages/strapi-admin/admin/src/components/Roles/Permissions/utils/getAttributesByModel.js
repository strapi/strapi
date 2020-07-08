import { getAttributesToDisplay } from '../../../../utils';

const getAttributesByModel = (contentType, components, attributeNamePrefix) => {
  let attributeName = attributeNamePrefix ? attributeNamePrefix.split('.') : [];
  const recursiveAttribute = (model, fromComponent) => {
    const attributes = getAttributesToDisplay(model).reduce((attributeAcc, currentAttribute) => {
      if (fromComponent) {
        attributeName.push(currentAttribute.attributeName);
      } else {
        attributeName = [
          ...(attributeNamePrefix ? attributeNamePrefix.split('.') : []),
          currentAttribute.attributeName,
        ];
      }

      if (currentAttribute.type === 'component') {
        const component = components.find(
          component => component.uid === currentAttribute.component
        );

        if (!attributeName[0]) {
          attributeName.push(currentAttribute.attributeName);
        }

        const componentAttributes = [...recursiveAttribute(component, true), ...attributeAcc];

        attributeName = attributeName.slice(0, attributeName.length - 1);

        return componentAttributes;
      }

      const attributeAccumulator = [
        ...attributeAcc,
        {
          ...currentAttribute,
          attributeName: attributeName.join('.'),
          contentTypeUid: contentType.uid,
        },
      ];

      attributeName = attributeName.slice(0, attributeName.length - 1);

      return attributeAccumulator;
    }, []);

    return attributes;
  };

  const recursiveAttributes = recursiveAttribute(contentType, false);

  return recursiveAttributes;
};

export default getAttributesByModel;
