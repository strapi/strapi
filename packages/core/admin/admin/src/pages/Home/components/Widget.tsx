import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { PuzzlePiece, WarningCircle } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
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
      width="100%"
    >
      <Flex direction="row" alignItems="center" gap={2}>
        <Icon fill="neutral500" />
        <Typography textColor="neutral500" variant="sigma">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Box width="100%" height="261px" overflow="auto">
        {children}
      </Box>
    </Flex>
  );
};

interface LoadingProps {
  children?: string;
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
  children?: string;
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
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.error',
            defaultMessage: "Couldn't load widget content.",
          })}
      </Typography>
    </Flex>
  );
};

interface NoDataProps {
  children?: string;
}

const NoData = ({ children }: NoDataProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" height="100%" justifyContent="center" alignItems="center" gap={6}>
      <EmptyDocuments width="16rem" height="8.8rem" />
      <Typography textColor="neutral600">
        {children ??
          formatMessage({
            id: 'HomePage.widget.no-data',
            defaultMessage: 'No content found.',
          })}
      </Typography>
    </Flex>
  );
};

const Widget = {
  Root,
  Loading,
  Error,
  NoData,
};

export { Widget };
