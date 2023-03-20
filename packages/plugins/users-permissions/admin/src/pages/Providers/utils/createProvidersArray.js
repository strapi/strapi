import sortBy from 'lodash/sortBy';

const createProvidersArray = (data) => {
  return sortBy(
    Object.keys(data).reduce((acc, current) => {
      const { icon: iconName, enabled, subdomain } = data[current];
      const icon = iconName === 'envelope' ? ['fas', 'envelope'] : ['fab', iconName];

      if (subdomain !== undefined) {
        acc.push({ name: current, icon, enabled, subdomain });
      } else {
        acc.push({ name: current, icon, enabled });
      }

      return acc;
    }, []),
    'name'
  );
};

export default createProvidersArray;
