import * as React from 'react';

import { Flex } from '@strapi/design-system';
import styled from 'styled-components';

const Root = ({ children }) => {
  return (
    <Flex paddingTop={2} paddingBottom={2} gap={2} paddingLeft={2} paddingRight={2}>
      {children}
    </Flex>
  );
};

const SectionWrapper = styled(Flex)`
  &:not(:last-child) {
    padding-right: ${({ theme }) => theme.spaces[2]};
    border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  }
`;

const Section = ({ children }) => {
  return <SectionWrapper gap={1}>{children}</SectionWrapper>;
};

const Toolbar = {
  Root,
  Section,
};

export default Toolbar;
