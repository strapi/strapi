import { get } from 'lodash';
import setDefaultForm from './createDefaultForm';

// Retrieve all the default values for the repeatables and init the form
const getDefaultGroupValues = (groups, groupLayouts) => {
  const defaultGroupValues = groups.reduce((acc, current) => {
    const defaultForm = setDefaultForm(
      get(groupLayouts, [current.group, 'schema', 'attributes'], {})
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

  return defaultGroupValues;
};

const retrieveDisplayedGroups = attributes => {
  return Object.keys(attributes).reduce((acc, current) => {
    const { group, repeatable, type, min } = get(attributes, [current], {
      group: '',
      type: '',
      repeatable,
    });

    if (type === 'group') {
      acc.push({ key: current, group, repeatable, isOpen: !repeatable, min });
    }

    return acc;
  }, []);
};

const retrieveGroupLayoutsToFetch = groups => {
  return groups
    .filter(
      (current, index) =>
        groups.findIndex(el => el.group === current.group) === index
    )
    .map(({ group }) => group);
};

export {
  getDefaultGroupValues,
  retrieveDisplayedGroups,
  retrieveGroupLayoutsToFetch,
};
