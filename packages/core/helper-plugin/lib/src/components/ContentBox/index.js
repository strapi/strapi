import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { TextButton } from '@strapi/parts/TextButton';

const IconWrapper = styled(Row)`
  margin-right: ${({ theme }) => theme.spaces[6]};
  svg {
    width: ${32 / 16}rem;
    height: ${32 / 16}rem;
  }
`;

const ContentBox = ({ title, subtitle, icon, iconBackground, endAction }) => {
  return (
    <Row shadow="tableShadow" hasRadius padding={6}>
      <IconWrapper background={iconBackground} hasRadius padding={3}>
        {icon}
      </IconWrapper>
      <Stack size={endAction ? '' : 1}>
        <Row>
          <TextButton>{title}</TextButton>
          {endAction}
        </Row>
        <Text textColor="neutral600">{subtitle}</Text>
      </Stack>
    </Row>
  );
};

ContentBox.defaultProps = {
  title: undefined,
  subtitle: undefined,
  icon: undefined,
  iconBackground: undefined,
  endAction: undefined,
};

ContentBox.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  iconBackground: PropTypes.string,
  endAction: PropTypes.node,
};

export default ContentBox;
