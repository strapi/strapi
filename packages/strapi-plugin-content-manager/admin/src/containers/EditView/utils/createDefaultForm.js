import { get } from 'lodash';

const setDefaultForm = attributes => {
  return Object.keys(attributes).reduce((acc, current) => {
    const attribute = get(attributes, [current], {});
    const {
      default: defaultValue,
      type,
      required,
      min,
      repeatable,
    } = attribute;

    // Fix for https://github.com/strapi/strapi/issues/2644
    if (type === 'json' && required === true) {
      acc[current] = JSON.stringify(null);
    }

    if (defaultValue !== undefined) {
      acc[current] = defaultValue;
    }

    if (type === 'group') {
      if (required === true) {
        acc[current] = repeatable === true ? [] : {};
      }

      if (min && repeatable === true) {
        acc[current] = [];

        for (let i = 0; i < min; i++) {
          acc[current].push({ _temp__id: i });
        }
      }
    }

    return acc;
  }, {});
};

export default setDefaultForm;
