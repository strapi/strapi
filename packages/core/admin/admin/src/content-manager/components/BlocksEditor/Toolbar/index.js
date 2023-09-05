import * as React from 'react';

import { Flex } from '@strapi/design-system';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Root = ({ children }) => {
  return (
    <Flex paddingTop={2} paddingBottom={2} gap={2} paddingLeft={2} paddingRight={2} role="toolbar">
      {children}
    </Flex>
  );
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
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

Section.propTypes = {
  children: PropTypes.node.isRequired,
};

const Toolbar = () => {
  return (
    <Root>
      <Section>
        <div>item</div>
      </Section>
      <Section>
        <div>item</div>
      </Section>
    </Root>
  );
};

export default Toolbar;
