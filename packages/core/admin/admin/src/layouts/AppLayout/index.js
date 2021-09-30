import React from 'react';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
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
