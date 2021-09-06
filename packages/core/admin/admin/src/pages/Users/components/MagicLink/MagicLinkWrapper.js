import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { Tooltip } from '@strapi/parts/Tooltip';
import { useNotification } from '@strapi/helper-plugin';
import Duplicate from '@strapi/icons/Duplicate';
import styled from 'styled-components';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useIntl } from 'react-intl';

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

const Wrapper = styled.button`
  padding-left: ${({ theme }) => theme.spaces[2]};
  font-size: ${({ theme }) => theme.spaces[3]};
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

const MagicLinkWrapper = ({ children, target }) => {
  const toggleNotification = useNotification();
  const copyButtonRef = useRef();
  const { formatMessage } = useIntl();

  useEffect(() => {
    if (copyButtonRef.current) {
      copyButtonRef.current.focus();
    }
  }, []);

  const handleCopy = () => {
    toggleNotification({ type: 'info', message: { id: 'notification.link-copied' } });
  };

  const copyLabel = formatMessage({
    id: 'app.component.CopyToClipboard.label',
    defaultMessage: 'Copy to clipboard',
  });

  return (
    <Box padding={6} background="neutral0" shadow="tableShadow" hasRadius>
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
              <Tooltip description={copyLabel}>
                <CopyToClipboard onCopy={handleCopy} text={target}>
                  <Wrapper type="button" ref={copyButtonRef}>
                    <Duplicate />
                  </Wrapper>
                </CopyToClipboard>
              </Tooltip>
            </Stack>

            <Text small textColor="neutral600" highlighted>
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
