import upperFirst from 'lodash/upperFirst';

const getSelectedValues = (rawValue) =>
  Object.values(rawValue)
    .map((x) =>
      Object.entries(x)
        .filter(([, value]) => value)
        .map(([key]) => key)
    )
    .flat();

const getNestedOptions = (options) =>
  options.reduce((acc, [label, children]) => {
    acc.push({
      label: upperFirst(label),
      children: children.map((child) => ({
        label: child.displayName,
        value: child.id,
      })),
    });

    return acc;
  }, []);

const getNewStateFromChangedValues = (options, changedValues) =>
  options
    .map(([, values]) => values)
    .flat()
    .reduce((acc, curr) => ({ [curr.id]: changedValues.includes(curr.id), ...acc }), {});

export { getNestedOptions, getSelectedValues, getNewStateFromChangedValues };
