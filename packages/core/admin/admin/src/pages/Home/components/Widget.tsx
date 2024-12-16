import * as React from 'react';

import { Box, Flex, type FlexProps, Loader, Typography } from '@strapi/design-system';
import { PuzzlePiece, WarningCircle } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { type MessageDescriptor, useIntl } from 'react-intl';

const WidgetCard = (props: FlexProps) => {
  return (
    <Flex
      hasRadius
      direction="column"
      alignItems="flex-start"
      width="100%"
      background="neutral0"
      shadow="tableShadow"
      tag="section"
      gap={4}
      padding={6}
      {...props}
    >
      {props.children}
    </Flex>
  );
};

interface RootProps {
  title: MessageDescriptor;
  icon?: typeof import('@strapi/icons').PuzzlePiece;
  children: React.ReactNode;
}

const Root = ({ title, icon = PuzzlePiece, children }: RootProps) => {
  const { formatMessage } = useIntl();
  const id = React.useId();
  const Icon = icon;

  return (
    <WidgetCard aria-labelledby={id}>
      <Flex direction="row" alignItems="center" gap={2} tag="header">
        <Icon fill="neutral500" aria-hidden />
        <Typography textColor="neutral500" variant="sigma" tag="h2" id={id}>
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Box width="100%" height="261px" overflow="auto" tag="main">
        {children}
      </Box>
    </WidgetCard>
  );
};

interface LoadingProps {
  children?: string;
}

const Loading = ({ children }: LoadingProps) => {
  const { formatMessage } = useIntl();

  return (
    <WidgetCard height="100%" justifyContent="center" alignItems="center">
      <Loader>
        {children ??
          formatMessage({
            id: 'HomePage.widget.loading',
            defaultMessage: 'Loading widget content',
          })}
      </Loader>
    </WidgetCard>
  );
};

interface ErrorProps {
  children?: string;
}

const Error = ({ children }: ErrorProps) => {
  const { formatMessage } = useIntl();

  return (
    <WidgetCard height="100%" justifyContent="center" alignItems="center" gap={2}>
      <WarningCircle width="3.2rem" height="3.2rem" fill="danger600" />
      <Typography variant="delta">
        {formatMessage({
          id: 'global.error',
          defaultMessage: 'Something went wrong',
        })}
      </Typography>
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.error',
            defaultMessage: "Couldn't load widget content.",
          })}
      </Typography>
    </WidgetCard>
  );
};

interface NoDataProps {
  children?: string;
}

const NoData = ({ children }: NoDataProps) => {
  const { formatMessage } = useIntl();

  return (
    <WidgetCard height="100%" justifyContent="center" alignItems="center" gap={6}>
      <EmptyDocuments width="16rem" height="8.8rem" />
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.no-data',
            defaultMessage: 'No content found.',
          })}
      </Typography>
    </WidgetCard>
  );
};

const Widget = {
  Root,
  Loading,
  Error,
  NoData,
};

export { Widget };
