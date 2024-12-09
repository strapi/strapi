import * as React from 'react';

import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { PuzzlePiece, WarningCircle } from '@strapi/icons';
import { type MessageDescriptor, useIntl } from 'react-intl';

interface RootProps {
  title: MessageDescriptor;
  icon?: typeof import('@strapi/icons').PuzzlePiece;
  children: React.ReactNode;
}

const Root = ({ title, icon = PuzzlePiece, children }: RootProps) => {
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
        {children}
      </Box>
    </Flex>
  );
};

interface LoadingProps {
  children?: React.ReactNode;
}

const Loading = ({ children }: LoadingProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" height="100%" justifyContent="center" alignItems="center">
      <Loader>
        {children ??
          formatMessage({
            id: 'HomePage.widget.loading',
            defaultMessage: 'Loading widget content',
          })}
      </Loader>
    </Flex>
  );
};

interface ErrorProps {
  children?: React.ReactNode;
}

const Error = ({ children }: ErrorProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" height="100%" justifyContent="center" alignItems="center" gap={2}>
      <WarningCircle width="3.2rem" height="3.2rem" fill="danger600" />
      <Typography variant="delta">
        {formatMessage({
          id: 'global.error',
          defaultMessage: 'Something went wrong',
        })}
      </Typography>
      {children ?? (
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'HomePage.widget.error',
            defaultMessage: "Couldn't load widget content.",
          })}
        </Typography>
      )}
    </Flex>
  );
};

const Widget = {
  Root,
  Loading,
  Error,
};

export { Widget };
