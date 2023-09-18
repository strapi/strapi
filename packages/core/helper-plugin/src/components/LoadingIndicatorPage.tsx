import * as React from 'react';

import { Flex, Loader } from '@strapi/design-system';
import styled from 'styled-components';

const Wrapper = styled(Flex)`
  height: 100vh;
`;

interface LoadingIndicatorPageProps {
  children?: React.ReactNode;
  'data-testid'?: string;
}

const LoadingIndicatorPage = ({
  children = 'Loading content.',
  'data-testid': dataTestId = 'loader',
}: LoadingIndicatorPageProps) => {
  return (
    <Wrapper justifyContent="space-around" data-testid={dataTestId}>
      <Loader>{children}</Loader>
    </Wrapper>
  );
};

export { LoadingIndicatorPage };
