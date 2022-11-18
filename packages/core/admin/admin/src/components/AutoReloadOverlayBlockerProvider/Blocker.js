import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled, { keyframes } from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import Clock from '@strapi/icons/Clock';
import Refresh from '@strapi/icons/Refresh';
import { Link } from '@strapi/design-system/v2/Link';
import { Box, Stack, Flex, Typography } from '@strapi/design-system';
import { Content, IconBox, Overlay } from './Overlay';

const overlayContainer = document.createElement('div');
const ID = 'autoReloadOverlayBlocker';
overlayContainer.setAttribute('id', ID);

const rotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`;

const LoaderReload = styled(Refresh)`
  animation: ${rotation} 1s infinite linear;
`;

const Blocker = ({ displayedIcon, description, title, isOpen }) => {
  const { formatMessage } = useIntl();

  useEffect(() => {
    document.body.appendChild(overlayContainer);

    return () => {
      document.body.removeChild(overlayContainer);
    };
  }, []);

  if (isOpen) {
    return ReactDOM.createPortal(
      <Overlay>
        <Content spacing={6}>
          <Stack spacing={2}>
            <Flex justifyContent="center">
              <Typography as="h1" variant="alpha">
                {formatMessage(title)}
              </Typography>
            </Flex>
            <Flex justifyContent="center">
              <Typography as="h2" textColor="neutral600" fontSize={4} fontWeight="regular">
                {formatMessage(description)}
              </Typography>
            </Flex>
          </Stack>
          <Flex justifyContent="center">
            {displayedIcon === 'reload' && (
              <IconBox padding={6} background="primary100" borderColor="primary200">
                <LoaderReload width={pxToRem(36)} height={pxToRem(36)} />
              </IconBox>
            )}

            {displayedIcon === 'time' && (
              <IconBox padding={6} background="primary100" borderColor="primary200">
                <Clock width={pxToRem(40)} height={pxToRem(40)} />
              </IconBox>
            )}
          </Flex>
          <Flex justifyContent="center">
            <Box paddingTop={2}>
              <Link href="https://docs.strapi.io" isExternal>
                {formatMessage({
                  id: 'global.documentation',
                  defaultMessage: 'Read the documentation',
                })}
              </Link>
            </Box>
          </Flex>
        </Content>
      </Overlay>,
      overlayContainer
    );
  }

  return null;
};

Blocker.propTypes = {
  displayedIcon: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  description: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.object.isRequired,
};

export default Blocker;
