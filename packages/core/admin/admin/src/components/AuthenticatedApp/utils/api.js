import { getFetchClient } from '@strapi/helper-plugin';

const { get } = getFetchClient();

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

export { fetchAppInfo, fetchCurrentUserPermissions, fetchUserRoles };
