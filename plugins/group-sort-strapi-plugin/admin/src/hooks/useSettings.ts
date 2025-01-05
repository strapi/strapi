import { useFetchClient } from '@strapi/strapi/admin';
import { UseQueryResult, useQuery } from 'react-query';
import { PLUGIN_ID } from '../../../shared/constants';
import { Settings } from '../../../shared/settings';

/**
 * Fetches group data (of type GroupResult) from the Strapi API
 * @param props - The parameters to fetch the group data, including the content type UID, group field, and group name
 * @returns The group data
 */
const useSettings = ({ updateCounter }: { updateCounter: number }) => {
  const fetchClient = useFetchClient();

  const result = useQuery({
    queryKey: [PLUGIN_ID, 'settings', updateCounter],
    async queryFn() {
      const result = await fetchClient.get(
        `/${PLUGIN_ID}/settings`
      );
      return result.data as Settings;
    },
  }) as UseQueryResult<Settings, unknown> & { settings: Settings | undefined };

  result.settings = result.data;
    
  return result;
};

export default useSettings;
