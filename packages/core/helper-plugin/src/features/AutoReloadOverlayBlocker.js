import * as React from 'react';

import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { Flex, Box, Typography } from '@strapi/design-system';
import { Refresh, Clock } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { createPortal } from 'react-dom';
import { Link } from '@strapi/design-system/v2';
import pxToRem from '../utils/pxToRem';

/**
 * TODO: realistically a lot of this logic is isolated to the `core/admin` package.
 * However, we want to expose the `useAutoReloadOverlayBlocker` hook to the plugins.
 *
 * Therefore, in V5 we should move this logic back to the `core/admin` package & export
 * the hook from that package and re-export here. For now, let's keep it all together
 * because it's easier to diagnose and we're not using a million refs because we don't
 * understand what's going on.
 */

/**
 * @preserve
 * @typedef {Object} AutoReloadOverlayBlockerConfig
 * @property {string | undefined} title
 * @property {string | undefined} description
 * @property {'reload' | 'time' | undefined} icon
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} AutoReloadOverlayBlockerContextValue
 * @property {(config: AutoReloadOverlayBlockerConfig) => void} lockAppWithAutoreload
 * @property {() => void} unlockAppWithAutoreload
 */

/**
 * @preserve
 * @type {React.Context<AutoReloadOverlayBlockerContextValue>}
 */

const AutoReloadOverlayBlockerContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const MAX_ELAPSED_TIME = 30 * 1000;

const AutoReloadOverlayBlockerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  /**
   * @type {[AutoReloadOverlayBlockerConfig, React.Dispatch<React.SetStateAction<AutoReloadOverlayBlockerConfig>>]}
   */
  const [config, setConfig] = React.useState(undefined);
  const [failed, setFailed] = React.useState(false);

  const lockAppWithAutoreload = React.useCallback((config = undefined) => {
    setIsOpen(true);
    setConfig(config);
  }, []);

  const unlockAppWithAutoreload = React.useCallback(() => {
    setIsOpen(false);
    setConfig(undefined);
  }, []);

  // eslint-disable-next-line consistent-return
  React.useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        setFailed(true);
      }, MAX_ELAPSED_TIME);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [isOpen]);

  let displayedIcon = config?.icon || 'reload';

  let description = {
    id: config?.description || 'components.OverlayBlocker.description',
    defaultMessage:
      "You're using a feature that needs the server to restart. Please wait until the server is up.",
  };

  let title = {
    id: config?.title || 'components.OverlayBlocker.title',
    defaultMessage: 'Waiting for restart',
  };

  if (failed) {
    displayedIcon = 'time';

    description = {
      id: 'components.OverlayBlocker.description.serverError',
      defaultMessage: 'The server should have restarted, please check your logs in the terminal.',
    };

    title = {
      id: 'components.OverlayBlocker.title.serverError',
      defaultMessage: 'The restart is taking longer than expected',
    };
  }

  const autoReloadValue = React.useMemo(
    () => ({
      lockAppWithAutoreload,
      unlockAppWithAutoreload,
    }),
    [lockAppWithAutoreload, unlockAppWithAutoreload]
  );

  return (
    <AutoReloadOverlayBlockerContext.Provider value={autoReloadValue}>
      <Blocker
        displayedIcon={displayedIcon}
        isOpen={isOpen}
        description={description}
        title={title}
      />
      {children}
    </AutoReloadOverlayBlockerContext.Provider>
  );
};

AutoReloadOverlayBlockerProvider.propTypes = {
  children: PropTypes.element.isRequired,
};

const Blocker = ({ displayedIcon = 'reload', description, title, isOpen }) => {
  const { formatMessage } = useIntl();

  // eslint-disable-next-line no-undef
  return isOpen && globalThis?.document?.body
    ? createPortal(
        <Overlay id="autoReloadOverlayBlocker" direction="column" alignItems="center" gap={6}>
          <Flex direction="column" alignItems="center" gap={2}>
            <Typography as="h1" variant="alpha">
              {formatMessage(title)}
            </Typography>
            <Typography as="h2" textColor="neutral600" fontSize={4} fontWeight="regular">
              {formatMessage(description)}
            </Typography>
          </Flex>
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
          <Box marginTop={2}>
            <Link href="https://docs.strapi.io" isExternal>
              {formatMessage({
                id: 'global.documentation',
                defaultMessage: 'Read the documentation',
              })}
            </Link>
          </Box>
        </Overlay>,
        // eslint-disable-next-line no-undef
        globalThis.document.body
      )
    : null;
};

Blocker.propTypes = {
  displayedIcon: PropTypes.string.isRequired,
  description: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.object.isRequired,
};

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

const Overlay = styled(Flex)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* TODO: set this up in the theme for consistence z-index values */
  z-index: 1140;
  padding-top: ${pxToRem(160)};

  & > * {
    position: relative;
    z-index: 1;
  }

  &:before {
    content: '';
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: ${({ theme }) => theme.colors.neutral0};
    opacity: 0.9;
  }
`;

const IconBox = styled(Box)`
  border-radius: 50%;
  svg {
    > path {
      fill: ${({ theme }) => theme.colors.primary600} !important;
    }
  }
`;

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {AutoReloadOverlayBlockerContextValue}
 */

const useAutoReloadOverlayBlocker = () => React.useContext(AutoReloadOverlayBlockerContext);

export {
  AutoReloadOverlayBlockerContext,
  AutoReloadOverlayBlockerProvider,
  useAutoReloadOverlayBlocker,
};
