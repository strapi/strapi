import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export const useLicenseLimitInfos = () => {
  const { get } = useFetchClient();
  const fetchLicenseLimitInfo = async () => {
    const {
      data: { data },
    } = await get('/admin/license-limit-information');

    return data;
  };

  const license = useQuery(['ee', 'license-limit-info'], fetchLicenseLimitInfo);

  return { license };
};
