import React from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import styled from 'styled-components';

const IconBox = styled(Box)`
  height: ${24 / 16}rem;
  width: ${24 / 16}rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    height: ${10 / 16}rem;
    width: ${10 / 16}rem;
  }

  svg path {
    fill: ${({ theme, color }) => theme.colors[`${color}600`]};
  }
`;

const ButtonBox = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
  display: block;
  width: 100%;
  border: none;
  position: relative;
  left: -0.25rem;
`;

const NestedTFooter = ({ children, icon, color, ...props }) => {
  return (
    <ButtonBox paddingBottom={4} paddingTop={4} as="button" type="button" {...props}>
      <Flex>
        <IconBox color={color} aria-hidden background={`${color}200`}>
          {icon}
        </IconBox>
        <Box paddingLeft={3}>
          <Typography variant="pi" fontWeight="bold" textColor={`${color}600`}>
            {children}
          </Typography>
        </Box>
      </Flex>
    </ButtonBox>
  );
};

NestedTFooter.propTypes = {
  color: PropTypes.string.isRequired,
  children: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
};

export default NestedTFooter;
