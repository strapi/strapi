import * as React from 'react';

import { Flex, Loader } from '@strapi/design-system';
import styled from 'styled-components';

const Wrapper = styled(Flex)`
  height: 100vh;
`;

interface LoadingIndicatorPageProps {
  'data-testid'?: string;
  children?: string;
}

const LoadingIndicatorPage = (
  { 'data-testid': dataTestId, children }: LoadingIndicatorPageProps = {
    'data-testid': 'loader',
    children: 'Loading content.',
  }
) => {
  return (
    <Wrapper justifyContent="space-around" data-testid={dataTestId}>
      <Loader>{children}</Loader>
    </Wrapper>
  );
};

export { LoadingIndicatorPage };
