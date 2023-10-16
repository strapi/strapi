import * as React from 'react';

import { Box, Flex, SkipToContent } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const FlexBox = styled(Box)`
  flex: 1;
`;

interface AppLayoutProps {
  children: React.ReactNode;
  sideNav: React.ReactNode;
}

export const AppLayout = ({ children, sideNav }: AppLayoutProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box background="neutral100">
      <SkipToContent>
        {formatMessage({ id: 'skipToContent', defaultMessage: 'Skip to content' })}
      </SkipToContent>
      <Flex alignItems="flex-start">
        {sideNav}
        <FlexBox>{children}</FlexBox>
      </Flex>
    </Box>
  );
};
