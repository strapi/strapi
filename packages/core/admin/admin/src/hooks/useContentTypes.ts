import * as React from 'react';

import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useGetContentTypesQuery } from '../services/contentManager';

import type { ContentType } from '../../../shared/contracts/content-types';

/**
 * Hook to fetch and return content types (collection types and single types).
 * This hook handles loading states and errors automatically, making it the
 * recommended way to access content types in plugins and admin components.
 *
 * @returns An object containing:
 * - `isLoading`: boolean indicating if content types are being fetched
 * - `collectionTypes`: array of collection type content types (defaults to empty array)
 * - `singleTypes`: array of single type content types (defaults to empty array)
 *
 * @example
 * ```tsx
 * import { useContentTypes } from '@strapi/admin/strapi-admin';
 *
 * function MyComponent() {
 *   const { isLoading, collectionTypes, singleTypes } = useContentTypes();
 *
 *   if (isLoading) {
 *     return <LoadingIndicator />;
 *   }
 *
 *   return (
 *     <div>
 *       <h2>Collection Types</h2>
 *       {collectionTypes.map(ct => <div key={ct.uid}>{ct.info.displayName}</div>)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContentTypes(): {
  isLoading: boolean;
  collectionTypes: ContentType[];
  singleTypes: ContentType[];
} {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();

  const { data, isLoading, error } = useGetContentTypesQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  return {
    isLoading,
    collectionTypes: data?.collectionType ?? [],
    singleTypes: data?.singleType ?? [],
  };
}
