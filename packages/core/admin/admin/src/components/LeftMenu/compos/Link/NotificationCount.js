import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';

const NotificationWrapper = styled.div`
  height: 14px;
  margin-top: 4px;
  margin-right: 20px;
  padding: 0px 4px;
  background-color: #383d49;
  border-radius: 2px;
  font-size: 11px;
`;

const NotificationCount = ({ count }) => (
  <NotificationWrapper>
    <Text fontWeight="bold" fontSize="xs" lineHeight="14px" color="#919bae">
      {count}
    </Text>
  </NotificationWrapper>
);

NotificationCount.defaultProps = {
  count: 0,
};

NotificationCount.propTypes = {
  count: PropTypes.number,
};

export default NotificationCount;
