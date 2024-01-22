import * as React from 'react';

import { useTypedSelector } from '../../core/store/hooks';
import { selectSchemas } from '../pages/App';
import { useGetContentTypeConfigurationQuery } from '../services/contentTypes';
import { type FormattedLayouts, formatLayouts } from '../utils/layouts';

const useContentTypeLayout = (
  contentTypeUID: string = ''
): {
  isLoading: boolean;
  layout: FormattedLayouts | null;
} => {
  const schemas = useTypedSelector(selectSchemas);

  const { data, isLoading } = useGetContentTypeConfigurationQuery(contentTypeUID);

  const layout = React.useMemo(() => (data ? formatLayouts(data, schemas) : null), [data, schemas]);

  return {
    isLoading,
    layout,
  };
};

export { useContentTypeLayout };
