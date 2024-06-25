import * as React from 'react';

import { Box, Flex, Typography, Link } from '@strapi/design-system';
import { Clock, ArrowClockwise } from '@strapi/icons';
import { createPortal } from 'react-dom';
import { MessageDescriptor, useIntl } from 'react-intl';
import { styled, keyframes } from 'styled-components';

/**
 * TODO: realistically a lot of this logic is isolated to the `core/admin` package.
 * However, we want to expose the `useAutoReloadOverlayBlocker` hook to the plugins.
 *
 * Therefore, in V5 we should move this logic back to the `core/admin` package & export
 * the hook from that package and re-export here. For now, let's keep it all together
 * because it's easier to diagnose and we're not using a million refs because we don't
 * understand what's going on.
 */
export interface AutoReloadOverlayBlockerConfig {
  title?: string;
  description?: string;
  icon?: 'reload' | 'time';
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

export interface AutoReloadOverlayBlockerContextValue {
  lockAppWithAutoreload?: (config?: AutoReloadOverlayBlockerConfig) => void;
  unlockAppWithAutoreload?: () => void;
}

const AutoReloadOverlayBlockerContext = React.createContext<AutoReloadOverlayBlockerContextValue>(
  {}
);

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

export interface AutoReloadOverlayBlockerProviderProps {
  children: React.ReactNode;
}

const MAX_ELAPSED_TIME = 30 * 1000;

const AutoReloadOverlayBlockerProvider = ({ children }: AutoReloadOverlayBlockerProviderProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<AutoReloadOverlayBlockerConfig>({});
  const [failed, setFailed] = React.useState(false);

  const lockAppWithAutoreload = React.useCallback((config: AutoReloadOverlayBlockerConfig = {}) => {
    setIsOpen(true);
    setConfig(config);
  }, []);

  const unlockAppWithAutoreload = React.useCallback(() => {
    setIsOpen(false);
    setConfig({});
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
      "You're using a feature that needs the server to restart. The page will reload automatically.",
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

interface BlockerProps {
  displayedIcon: string;
  description: MessageDescriptor;
  isOpen: boolean;
  title: MessageDescriptor;
}

const Blocker = ({ displayedIcon, description, title, isOpen }: BlockerProps) => {
  const { formatMessage } = useIntl();

  // eslint-disable-next-line no-undef
  return isOpen && globalThis?.document?.body
    ? createPortal(
        <Overlay id="autoReloadOverlayBlocker" direction="column" alignItems="center" gap={6}>
          <Flex direction="column" alignItems="center" gap={2}>
            <Typography tag="h1" variant="alpha">
              {formatMessage(title)}
            </Typography>
            <Typography tag="h2" textColor="neutral600" fontSize={4} fontWeight="regular">
              {formatMessage(description)}
            </Typography>
          </Flex>
          {displayedIcon === 'reload' && (
            <IconBox padding={6} background="primary100" borderColor="primary200">
              <LoaderReload width="3.6rem" height="3.6rem" />
            </IconBox>
          )}
          {displayedIcon === 'time' && (
            <IconBox padding={6} background="primary100" borderColor="primary200">
              <Clock width="4rem" height="4rem" />
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

const rotation = keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(359deg);
    }
  `;

const LoaderReload = styled(ArrowClockwise)`
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
  padding-top: 16rem;

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

const useAutoReloadOverlayBlocker = () => React.useContext(AutoReloadOverlayBlockerContext);

export { AutoReloadOverlayBlockerProvider, useAutoReloadOverlayBlocker };
