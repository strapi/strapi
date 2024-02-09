import * as React from 'react';

import { ContentLayout, Typography } from '@strapi/design-system';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

interface VersionContentProps {
  version: Contracts.HistoryVersions.HistoryVersionDataResponse;
}

export const VersionContent = ({ version }: VersionContentProps) => {
  return (
    <ContentLayout>
      <Typography>TODO: display content for version {version.id}</Typography>
    </ContentLayout>
  );
};
