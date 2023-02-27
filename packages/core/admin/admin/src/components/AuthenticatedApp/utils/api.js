import axios from 'axios';
import { getFetchClient } from '@strapi/helper-plugin';
import checkLatestStrapiVersion from './checkLatestStrapiVersion';
import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;
const showUpdateNotif = !JSON.parse(localStorage.getItem('STRAPI_UPDATE_NOTIF'));
const { get } = getFetchClient();

const fetchStrapiLatestRelease = async (toggleNotification) => {
  try {
    const {
      data: { tag_name },
    } = await axios.get('https://api.github.com/repos/strapi/strapi/releases/latest');

    const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, tag_name);

    if (shouldUpdateStrapi && showUpdateNotif) {
      toggleNotification({
        type: 'info',
        message: { id: 'notification.version.update.message' },
        link: {
          url: `https://github.com/strapi/strapi/releases/tag/${tag_name}`,
          label: {
            id: 'global.see-more',
          },
        },
        blockTransition: true,
        onClose: () => localStorage.setItem('STRAPI_UPDATE_NOTIF', true),
      });
    }

    return tag_name;
  } catch (err) {
    // Don't throw an error
    return strapiVersion;
  }
};

const fetchAppInfo = async () => {
  try {
    const { data, headers } = await get('/admin/information');

    if (!headers['content-type'].includes('application/json')) {
      throw new Error('Not found');
    }

    return data.data;
  } catch (error) {
    throw new Error(error);
  }
};

const fetchCurrentUserPermissions = async () => {
  try {
    const { data, headers } = await get('/admin/users/me/permissions');

    if (!headers['content-type'].includes('application/json')) {
      throw new Error('Not found');
    }

    return data.data;
  } catch (err) {
    throw new Error(err);
  }
};

const fetchUserRoles = async () => {
  try {
    const {
      data: {
        data: { roles },
      },
    } = await get('/admin/users/me');

    return roles;
  } catch (err) {
    throw new Error(err);
  }
};

export { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease, fetchUserRoles };
