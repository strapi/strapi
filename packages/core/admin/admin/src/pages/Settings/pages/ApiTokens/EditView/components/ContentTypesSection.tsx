import { Accordion, Box } from '@strapi/design-system';

import { ContentApiPermission } from '../../../../../../../../shared/contracts/content-api/permissions';

import { CollapsableContentType } from './CollapsableContentType';

interface ContentTypesSectionProps {
  section: ContentApiPermission[] | null;
}

export const ContentTypesSection = ({ section = null, ...props }: ContentTypesSectionProps) => {
  return (
    <Box padding={4} background="neutral0">
      <Accordion.Root size="M">
        {section &&
          section.map((api, index) => (
            <CollapsableContentType
              key={api.apiId}
              label={api.label}
              controllers={api.controllers}
              orderNumber={index}
              {...props}
            />
          ))}
      </Accordion.Root>
    </Box>
  );
};
