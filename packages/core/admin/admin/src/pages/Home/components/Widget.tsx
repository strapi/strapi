import * as React from 'react';

import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { PuzzlePiece } from '@strapi/icons';
import { type MessageDescriptor, useIntl } from 'react-intl';

interface WidgetProps {
  title: MessageDescriptor;
  icon?: typeof import('@strapi/icons').PuzzlePiece;
  children: React.ReactNode;
  isLoading?: boolean;
}

const Widget = ({ title, icon = PuzzlePiece, isLoading = false, children }: WidgetProps) => {
  const { formatMessage } = useIntl();
  const Icon = icon;

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
        <Icon fill="neutral500" />
        <Typography textColor="neutral500" variant="sigma">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Box width="100%" height="256px" overflow="auto">
        {isLoading ? (
          <Flex direction="column" height="100%" justifyContent="center" alignItems="center">
            <Loader>
              {formatMessage({
                id: 'HomePage.widget.loader',
                defaultMessage: 'Loading widget content',
              })}
            </Loader>
          </Flex>
        ) : (
          children
        )}
      </Box>
    </Flex>
  );
};

export { Widget };
