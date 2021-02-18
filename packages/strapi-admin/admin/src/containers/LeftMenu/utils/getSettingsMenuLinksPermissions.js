import { get, isEmpty } from 'lodash';

const getSettingsMenuLinksPermissions = menu =>
  menu.reduce((acc, current) => {
    const links = get(current, 'links', []);

    const permissions = links.reduce((acc, current) => {
      let currentPermissions = get(current, 'permissions', null);

      if (isEmpty(currentPermissions)) {
        return [...acc, null];
      }

      return [...acc, ...currentPermissions];
    }, []);

    return [...acc, ...permissions];
  }, []);

export default getSettingsMenuLinksPermissions;
