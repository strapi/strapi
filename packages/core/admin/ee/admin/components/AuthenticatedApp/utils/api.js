import { axiosInstance } from '../../../../../admin/src/core/utils';

const fetchLicenseLimitInfo = async () => {
  try {
    const { data, headers } = await axiosInstance.get('/admin/license-limit-information');

    if (!headers['content-type'].includes('application/json')) {
      throw new Error('Not found');
    }

    return data.data;
  } catch (error) {
    throw new Error(error);
  }
};

export { fetchLicenseLimitInfo };
