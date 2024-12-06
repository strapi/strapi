import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { type MessageDescriptor, useIntl } from 'react-intl';

interface WidgetProps {
  title: MessageDescriptor;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Widget = ({ title, icon, children }: WidgetProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex
      direction="column"
      alignItems="flex-start"
      gap={4}
      background="neutral0"
      padding={6}
      shadow="tableShadow"
      hasRadius
    >
      <Flex direction="row" alignItems="center" gap={2}>
        {icon}
        <Typography textColor="neutral500" variant="sigma">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Box width="100%" height="256px" overflow="auto">
        {children}
      </Box>
    </Flex>
  );
};

export { Widget };
