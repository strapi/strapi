import { useFetchClient } from '@strapi/strapi/admin';
import { UseQueryResult, useQuery } from 'react-query';
import { PLUGIN_ID } from '../../../shared/constants';
import { GroupResult } from '../../../shared/contracts';

export interface UseGroupDataParams {
  contentTypeUid: string | undefined;
  groupField: string | undefined;
  groupName: string | undefined;
  updateCounter: number;
}

/**
 * Fetches group data (of type GroupResult) from the Strapi API
 * @param props - The parameters to fetch the group data, including the content type UID, group field, and group name
 * @returns The group data
 */
const useGroupData = (props: UseGroupDataParams) => {
  const { contentTypeUid, groupField, groupName, updateCounter } = props;

  const fetchClient = useFetchClient();

  const result = useQuery({
    queryKey: [PLUGIN_ID, 'groups', updateCounter, contentTypeUid, groupField, groupName],
    async queryFn() {
      const result = await fetchClient.get(
        `/${PLUGIN_ID}/groups/${contentTypeUid}/${groupField}/${groupName}`
      );
      return result.data as GroupResult;
    },
    enabled: !!contentTypeUid && !!groupField && !!groupName,
  }) as UseQueryResult<GroupResult, unknown> & { groupData: GroupResult | undefined };

  result.groupData = result.data;
    
  return result;
};

export default useGroupData;
