import { sortBy } from 'lodash';

const createProvidersArray = data => {
  return sortBy(
    Object.keys(data).reduce((acc, current) => {
      const { icon: iconName, enabled, subdomain } = data[current];
      const icon = iconName === 'envelope' ? ['fas', 'envelope'] : ['fab', iconName];

      acc.push({ name: current, icon, enabled, subdomain });

      return acc;
    }, []),
    'name'
  );
};

export default createProvidersArray;
