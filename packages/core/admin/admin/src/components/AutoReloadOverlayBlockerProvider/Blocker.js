import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useIntl } from 'react-intl';
import styled, { keyframes } from 'styled-components';
import Time from '@strapi/icons/Time';
import Reload from '@strapi/icons/Reload';
import { Link } from '@strapi/parts/Link';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Flex } from '@strapi/parts/Flex';
import { H1, H2 } from '@strapi/parts/Text';
import PropTypes from 'prop-types';
import Overlay from './Overlay';

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
  ${({ small }) => small && `width: 25px; height: 25px;`}
`;

const Blocker = ({ displayedIcon, description, title, elapsed, isOpen }) => {
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
        <Box>
          <Flex>
            {displayedIcon === 'reload' && (
              <Box paddingRight={3} style={{ alignSelf: 'baseline' }}>
                <LoaderReload width="4rem" height="4rem" />
              </Box>
            )}
            {displayedIcon === 'time' && (
              <Box paddingRight={3} style={{ alignSelf: 'center' }}>
                <Time width="3.8rem" height="3.8rem" />
              </Box>
            )}
            <Stack size={2}>
              <H1>{formatMessage(title)}</H1>
              <H2 textColor="neutral600">{formatMessage(description)}</H2>
              <Flex>
                {elapsed < 15 && (
                  <Link
                    href="https://strapi.io/documentation"
                    target="_blank"
                    onClick={e => {
                      e.preventDefault();
                      window.open('https://strapi.io/documentation', '_blank');
                    }}
                  >
                    Read the documentation
                  </Link>
                )}
              </Flex>
            </Stack>
          </Flex>
        </Box>
      </Overlay>,
      overlayContainer
    );
  }

  return null;
};

Blocker.propTypes = {
  displayedIcon: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  description: PropTypes.object.isRequired,
  elapsed: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.object.isRequired,
};

export default Blocker;
