import { axiosInstance } from '../../../../core/utils';

const fetchData = async search => {
  try {
    const {
      data: { data },
    } = await axiosInstance.get(`/admin/users${search}`);

    return data;
  } catch (err) {
    throw new Error(err);
  }
};

export default fetchData;
