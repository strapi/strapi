import React from 'react';
import { Box } from '@strapi/parts/Box';
import { Flex } from '@strapi/parts/Flex';
import { SkipToContent } from '@strapi/parts/Main';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

const FlexBox = styled(Box)`
  flex: 1;
`;

const AppLayout = ({ children, sideNav }) => {
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

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
  sideNav: PropTypes.node.isRequired,
};

export default AppLayout;
