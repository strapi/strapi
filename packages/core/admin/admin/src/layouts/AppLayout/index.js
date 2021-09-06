import React from 'react';
import { Row, Box, SkipToContent } from '@strapi/parts';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const FlexBox = styled(Box)`
  flex: 1;
`;

const AppLayout = ({ children, sideNav }) => {
  return (
    <Box background="neutral100">
      <SkipToContent>
        <FormattedMessage id="skipToContent" />
      </SkipToContent>
      <Row alignItems="flex-start">
        {sideNav}
        <FlexBox>{children}</FlexBox>
      </Row>
    </Box>
  );
};

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
  sideNav: PropTypes.node.isRequired,
};

export default AppLayout;
