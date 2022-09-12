import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';

const IconWrapper = styled(Flex)`
  margin-right: ${({ theme }) => theme.spaces[6]};
  svg {
    width: ${32 / 16}rem;
    height: ${32 / 16}rem;
  }
`;

const TypographyWordBreak = styled(Typography)`
  word-break: break-all;
`;

const ContentBox = ({ title, subtitle, icon, iconBackground, endAction, titleEllipsis }) => {
  if (title.length > 70 && titleEllipsis) {
    title = `${title.substring(0, 70)}...`;
  }

  return (
    <Flex shadow="tableShadow" hasRadius padding={6} background="neutral0">
      <IconWrapper background={iconBackground} hasRadius padding={3}>
        {icon}
      </IconWrapper>
      <Stack spacing={endAction ? 0 : 1}>
        <Flex>
          <TypographyWordBreak fontWeight="semiBold" variant="pi">
            {title}
          </TypographyWordBreak>
          {endAction}
        </Flex>
        <Typography textColor="neutral600">{subtitle}</Typography>
      </Stack>
    </Flex>
  );
};

ContentBox.defaultProps = {
  titleEllipsis: false,
  title: undefined,
  subtitle: undefined,
  icon: undefined,
  iconBackground: undefined,
  endAction: undefined,
};

ContentBox.propTypes = {
  titleEllipsis: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  iconBackground: PropTypes.string,
  endAction: PropTypes.node,
};

export default ContentBox;
