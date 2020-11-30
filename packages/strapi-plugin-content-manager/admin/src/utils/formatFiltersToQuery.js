import { get } from 'lodash';

const formatFilterName = (name, metadatas) => {
  const mainField = get(metadatas, [name, 'edit', 'mainField'], null);

  if (mainField) {
    return `${name}.${metadatas[name].edit.mainField}`;
  }

  return name;
};

const formatFiltersToQuery = (array, metadatas) => {
  const nextFilters = array.map(({ name, filter, value }) => {
    const formattedName = formatFilterName(name, metadatas);

    if (filter === '=') {
      return { [formattedName]: value };
    }

    return { [`${formattedName}${filter}`]: value };
  });

  return { _where: nextFilters };
};

export default formatFiltersToQuery;
