import { makeUnique } from '../../../utils/makeUnique';

export const retrieveNestedComponents = (appComponents: any) => {
  const nestedComponents = Object.keys(appComponents).reduce((acc: any, current) => {
    const componentAttributes = appComponents?.[current]?.schema?.attributes ?? [];
    const currentComponentNestedCompos = getComponentsFromComponent(componentAttributes);

    return [...acc, ...currentComponentNestedCompos];
  }, []);

  return makeUnique(nestedComponents);
};

const getComponentsFromComponent = (componentAttributes: any) => {
  return componentAttributes.reduce((acc: any, current: any) => {
    const { type, component } = current;

    if (type === 'component') {
      acc.push(component);
    }

    return acc;
  }, []);
};
