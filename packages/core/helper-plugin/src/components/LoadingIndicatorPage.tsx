import * as React from 'react';

import { Flex, Loader } from '@strapi/design-system';
import styled from 'styled-components';

const Wrapper = styled(Flex)`
  height: 100vh;
`;

interface LoadingIndicatorPageProps {
  children?: string;
}

const LoadingIndicatorPage = (
  { children }: LoadingIndicatorPageProps = {
    children: 'Loading content.',
  }
) => {
  return (
    <Wrapper justifyContent="space-around">
      <Loader>{children}</Loader>
    </Wrapper>
  );
};

export { LoadingIndicatorPage };
