import { axiosInstance, getRequestURL } from '../../../utils';

const fetchData = async () => {
  const { data } = await axiosInstance.get(getRequestURL('advanced'));

  return data;
};

const putAdvancedSettings = body => {
  return axiosInstance.put(getRequestURL('advanced'), body);
};

export { fetchData, putAdvancedSettings };
