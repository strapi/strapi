import { sortBy } from 'lodash';

const generateRows = (obj, onConfirm) => {
  const rows = Object.values(obj).map(
    ({ name, pluginLogo, id, description, isRequired, withSetting, icon }) => {
      return {
        name,
        logo: pluginLogo,
        id,
        description,
        isRequired,
        withSetting: withSetting || false,
        icon,
        onConfirm,
      };
    }
  );

  return sortBy(rows, [obj => obj.name.toLowerCase()]);
};

export default generateRows;
