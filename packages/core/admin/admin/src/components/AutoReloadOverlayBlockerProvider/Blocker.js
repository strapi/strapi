import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled, { keyframes } from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import Time from '@strapi/icons/Time';
import Reload from '@strapi/icons/Reload';
import { Link } from '@strapi/parts/Link';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Flex } from '@strapi/parts/Flex';
import { H1, Typography } from '@strapi/parts/Text';
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

const LoaderReload = styled(Reload)`
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
        <Content size={6}>
          <Stack size={2}>
            <Flex justifyContent="center">
              <H1>{formatMessage(title)}</H1>
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
                <Time width={pxToRem(40)} height={pxToRem(40)} />
              </IconBox>
            )}
          </Flex>
          <Flex justifyContent="center">
            <Box paddingTop={2}>
              <Link
                href="https://strapi.io/documentation"
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {formatMessage({
                  id: 'app.components.BlockLink.documentation',
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
