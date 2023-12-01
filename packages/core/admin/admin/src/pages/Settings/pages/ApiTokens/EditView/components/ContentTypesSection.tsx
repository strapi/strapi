import * as React from 'react';

import { Box } from '@strapi/design-system';

import { ContentApiPermission } from '../../../../../../../../shared/contracts/content-api/permissions';

import { CollapsableContentType } from './CollabsableContentType';

interface ContentTypesSectionProps {
  section: ContentApiPermission[] | null;
}

export const ContentTypesSection = ({ section = null, ...props }: ContentTypesSectionProps) => {
  const [indexExpandedCollpsedContent, setIndexExpandedCollpsedContent] = React.useState<
    null | number
  >(null);
  const handleExpandedCollpsedContentIndex = (index: number) =>
    setIndexExpandedCollpsedContent(index);

  return (
    <Box padding={4} background="neutral0">
      {section &&
        section.map((api, index) => (
          <CollapsableContentType
            key={api.apiId}
            label={api.label}
            controllers={api.controllers}
            orderNumber={index}
            indexExpandendCollapsedContent={indexExpandedCollpsedContent}
            onExpanded={handleExpandedCollpsedContentIndex}
            {...props}
          />
        ))}
    </Box>
  );
};
