import axios from 'axios';
import checkLatestStrapiVersion from './checkLatestStrapiVersion';
import { axiosInstance } from '../../../core/utils';
import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;
const showUpdateNotif = !JSON.parse(localStorage.getItem('STRAPI_UPDATE_NOTIF'));

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
    const { data, headers } = await axiosInstance.get('/admin/information');
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
    );

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
    const { data, headers } = await axiosInstance.get('/admin/users/me/permissions');
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
    );

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
    } = await axiosInstance.get('/admin/users/me');
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
    );

    return roles;
  } catch (err) {
    throw new Error(err);
  }
};

export { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease, fetchUserRoles };
