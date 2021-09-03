import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { useNotification } from '@strapi/helper-plugin';
import { Duplicate } from '@strapi/icons';
import styled from 'styled-components';
import { CopyToClipboard } from 'react-copy-to-clipboard';

// FIXME replace with parts when ready
const Envelope = () => (
  <svg width="24" height="17" xmlns="http://www.w3.org/2000/svg">
    <text
      transform="translate(-23 -9)"
      fill="#4B515A"
      fillRule="evenodd"
      fontSize="24"
      fontFamily="AppleColorEmoji, Apple Color Emoji"
    >
      <tspan x="23" y="28">
        ✉️
      </tspan>
    </text>
  </svg>
);

const Wrapper = styled.div`
  padding-left: ${({ theme }) => theme.spaces[2]};
  font-size: ${({ theme }) => theme.spaces[3]};
  cursor: pointer;
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

const MagicLinkWrapper = ({ children, target }) => {
  const toggleNotification = useNotification();

  const handleCopy = () => {
    toggleNotification({ type: 'info', message: { id: 'notification.link-copied' } });
  };

  return (
    <Box padding={6} shadow="tableShadow">
      <Row>
        <Box background="neutral100" padding={2} hasRadius>
          <Envelope />
        </Box>
        <Box paddingLeft={6}>
          <Stack gap={2}>
            <Stack horizontal gap={2}>
              <Text small textColor="neutral800" highlighted>
                {target}
              </Text>
              <CopyToClipboard onCopy={handleCopy} text={target}>
                <Wrapper small>
                  <Duplicate />
                </Wrapper>
              </CopyToClipboard>
            </Stack>

            <Text small textColor="neutral500" highlighted>
              {children}
            </Text>
          </Stack>
        </Box>
      </Row>
    </Box>
  );
};

MagicLinkWrapper.propTypes = {
  children: PropTypes.element.isRequired,
  target: PropTypes.string.isRequired,
};

export default MagicLinkWrapper;
