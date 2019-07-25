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

    if (defaultValue !== undefined) {
      acc[current] = defaultValue;
    }

    if (type === 'json') {
      acc[current] = null;
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

function init(initialState) {
  return initialState;
}

export default init;
export { setDefaultForm };
