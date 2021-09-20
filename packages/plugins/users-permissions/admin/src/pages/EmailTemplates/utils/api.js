import { axiosInstance, getRequestURL } from '../../../utils';

const fetchData = async () => {
  const { data } = await axiosInstance.get(getRequestURL('email-templates'));

  return data;
};

const putEmailTemplate = body => {
  return axiosInstance.put(getRequestURL('email-templates'), body);
};

export { fetchData, putEmailTemplate };
