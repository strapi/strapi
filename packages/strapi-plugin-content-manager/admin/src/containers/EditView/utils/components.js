import { get } from 'lodash';

import setDefaultForm from './createDefaultForm';

// Retrieve all the default values for the repeatables and init the form
const getDefaultComponentValues = (components, componentLayouts) => {
  const defaultComponentValues = components.reduce((acc, current) => {
    const defaultForm = setDefaultForm(
      get(componentLayouts, [current.component, 'schema', 'attributes'], {})
    );
    const arr = [];

    if (current.min && current.repeatable === true) {
      for (let i = 0; i < current.min; i++) {
        arr.push({ ...defaultForm, _temp__id: i });
      }
    }

    acc[current.key] = {
      toSet: arr,
      defaultRepeatable: defaultForm,
    };

    if (current.repeatable !== true) {
      acc[current.key] = {
        toSet: defaultForm,
        defaultRepeatable: defaultForm,
      };
    }

    return acc;
  }, {});

  return defaultComponentValues;
};

const retrieveDisplayedComponents = attributes => {
  return Object.keys(attributes).reduce((acc, current) => {
    const { component, repeatable, type, min } = get(attributes, [current], {
      component: '',
      type: '',
      repeatable,
    });

    if (type === 'component') {
      acc.push({
        key: current,
        component,
        repeatable,
        isOpen: !repeatable,
        min,
      });
    }

    return acc;
  }, []);
};

const retrieveComponentsLayoutsToFetch = components => {
  return components
    .filter(
      (current, index) =>
        components.findIndex(el => el.component === current.component) === index
    )
    .map(({ component }) => component);
};

export {
  getDefaultComponentValues,
  retrieveDisplayedComponents,
  retrieveComponentsLayoutsToFetch,
};
