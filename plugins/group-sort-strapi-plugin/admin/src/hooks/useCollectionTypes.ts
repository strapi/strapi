import { Struct } from '@strapi/strapi';
import { useFetchClient } from '@strapi/strapi/admin';
import { UseQueryResult, useQuery } from 'react-query';
import { PLUGIN_ID } from '../../../shared/constants';

/**
 * Fetches all collection types from the Strapi API
 * @param dependencies - An array of dependencies that will trigger a refetch when changed
 * @returns The collection types
 */
const useCollectionTypes = ({updateCounter}: {updateCounter: number}) => {
  const fetchClient = useFetchClient();

  const result = useQuery({
    queryKey: [PLUGIN_ID, updateCounter],
    async queryFn() {
      const result = await fetchClient.get('/content-manager/content-types');
      const allCollectionTypes = result.data.data as Struct.ContentTypeSchema[];

      const filteredCollectionTypes = allCollectionTypes.filter(
        (collectionType: any) =>
          collectionType.isDisplayed && collectionType.kind === 'collectionType'
      );
      return filteredCollectionTypes;
    },
  }) as UseQueryResult<Struct.ContentTypeSchema[], unknown> & { collectionTypes: Struct.ContentTypeSchema[] | undefined };
  
  result.collectionTypes = result.data;
  return result;
};

export default useCollectionTypes;
