import axios from 'axios';
import { axiosInstance } from '../../../core/utils';
import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;

const fetchStrapiLatestRelease = async () => {
  try {
    const {
      data: { strapiVersion },
    } = await axios.get(`${strapi.backendURL}/admin/information`);

    return strapiVersion;
  } catch (err) {
    // Don't throw an error
    return strapiVersion;
  }
};

const fetchAppInfo = async () => {
  try {
    const { data, headers } = await axiosInstance.get('/admin/information');

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

    if (!headers['content-type'].includes('application/json')) {
      throw new Error('Not found');
    }

    return data.data;
  } catch (err) {
    throw new Error(err);
  }
};

export { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease };
