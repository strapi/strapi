import * as React from 'react';

import { WIDTH_SIDE_NAVIGATION, createContext } from '@strapi/admin/strapi-admin';
import { Portal, Flex, Box, ScrollArea, IconButton } from '@strapi/design-system';
import { CaretDown, CaretUp } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

/**
 * ActionsDrawer is a component used in the content manager edit view page and content history page.
 * It's a sticky banner that can expand to reveal more actions. It's used only in mobile and tablet.
 *
 * A similar component is currently in development in the design-system but it's not ready yet.
 * Using the Panels for the edit view page brought some complexity and for the moment, we decided to go with this custom implementation.
 *
 * @TODO: Replace this component with the one in the design-system when it's ready.
 */

/* -------------------------------------------------------------------------------------------------
 * ActionsDrawer Context
 * -----------------------------------------------------------------------------------------------*/

interface ActionsDrawerContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasContent: boolean;
  hasSideNav: boolean;
}

const [ActionsDrawerProvider, useActionsDrawer] = createContext<ActionsDrawerContextValue | null>(
  'ActionsDrawer',
  null
);

/* -------------------------------------------------------------------------------------------------
 * Styled Components
 * -----------------------------------------------------------------------------------------------*/

const DrawerContainer = styled(Portal)<{ $hasSideNav: boolean; $isOpen: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ $isOpen }) => ($isOpen ? 4 : 2)};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;

  ${({ theme }) => theme.breakpoints.medium} {
    z-index: 2;
    left: ${({ $hasSideNav }) => ($hasSideNav ? WIDTH_SIDE_NAVIGATION : 0)};
  }
`;

const DrawerOverlay = styled(Box)<{ $isOpen: boolean; $hasSideNav: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity ${(props) => props.theme.motion.timings['200']}
    ${(props) => props.theme.motion.easings.easeInOutQuad};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};

  ${({ theme }) => theme.breakpoints.medium} {
    left: ${({ $hasSideNav }) => ($hasSideNav ? WIDTH_SIDE_NAVIGATION : 0)};
  }
`;

const ToggleButton = styled(IconButton)`
  padding: 0;
  border: none;
  background: ${({ theme }) => theme.colors.neutral200};
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DrawerContent = styled(Flex)`
  flex-direction: column;
  align-items: stretch;
  position: relative;
  z-index: 1;
  pointer-events: auto;
`;

const DrawerContentInner = styled(ScrollArea)<{ $isOpen: boolean }>`
  max-height: ${({ $isOpen }) =>
    $isOpen
      ? 'calc(100vh - 25rem)' // 25rem is arbitrary, to be able to see a bit of the content behind (navigation and header)
      : '0'};
  overflow: hidden;
  transition: max-height ${(props) => props.theme.motion.timings['200']}
    ${(props) => props.theme.motion.easings.easeInOutQuad};
  z-index: 1;
  pointer-events: auto;
`;

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface RootProps {
  children: React.ReactNode;
  hasContent?: boolean;
  hasSideNav?: boolean;
}

const Root = ({ children, hasContent = false, hasSideNav = false }: RootProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close drawer when there's no content
  React.useEffect(() => {
    if (!hasContent) {
      setIsOpen(false);
    }
  }, [hasContent]);

  return (
    <ActionsDrawerProvider
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      hasContent={hasContent}
      hasSideNav={hasSideNav}
    >
      <DrawerContainer $hasSideNav={hasSideNav} $isOpen={isOpen}>
        {children}
      </DrawerContainer>
    </ActionsDrawerProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Overlay
 * -----------------------------------------------------------------------------------------------*/

const Overlay = () => {
  const ctx = useActionsDrawer('ActionsDrawer.Overlay', (s) => s, false);
  const isOpen = ctx?.isOpen ?? false;
  const hasContent = ctx?.hasContent ?? false;
  const hasSideNav = ctx?.hasSideNav ?? false;
  const setIsOpen = ctx?.setIsOpen;

  if (!hasContent) {
    return null;
  }

  return (
    <DrawerOverlay
      $isOpen={isOpen}
      $hasSideNav={hasSideNav}
      onClick={() => setIsOpen?.(false)}
      data-testid="actions-drawer-overlay"
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

interface HeaderProps {
  children: React.ReactNode;
}

const Header = ({ children }: HeaderProps) => {
  const ctx = useActionsDrawer('ActionsDrawer.Header', (s) => s, false);
  const isOpen = ctx?.isOpen ?? false;
  const hasContent = ctx?.hasContent ?? false;
  const setIsOpen = ctx?.setIsOpen;
  const { formatMessage } = useIntl();

  const toggleOpen = () => {
    setIsOpen?.((prev: boolean) => !prev);
  };

  return (
    <DrawerContent background="neutral0">
      <Flex
        paddingTop={3}
        paddingBottom={3}
        paddingLeft={4}
        paddingRight={4}
        gap={3}
        borderStyle="solid"
        borderWidth={isOpen ? '1px 0' : '1px 0 0 0'}
        borderColor="neutral150"
      >
        <Flex flex={1} gap={2} alignItems="center" overflow="hidden">
          {children}
        </Flex>
        {hasContent && (
          <ToggleButton
            onClick={toggleOpen}
            label={
              isOpen
                ? formatMessage({
                    id: 'content-manager.actions-drawer.close',
                    defaultMessage: 'Close more actions',
                  })
                : formatMessage({
                    id: 'content-manager.actions-drawer.open',
                    defaultMessage: 'Open more actions',
                  })
            }
          >
            {isOpen ? <CaretUp fill="neutral600" /> : <CaretDown fill="neutral600" />}
          </ToggleButton>
        )}
      </Flex>
    </DrawerContent>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

interface ContentProps {
  children: React.ReactNode;
}

const Content = ({ children }: ContentProps) => {
  const ctx = useActionsDrawer('ActionsDrawer.Content', (s) => s, false);
  const isOpen = ctx?.isOpen ?? false;

  return (
    <DrawerContentInner $isOpen={isOpen}>
      <Flex
        direction="column"
        alignItems="stretch"
        justifyContent="flex-start"
        padding={{ initial: 4, large: 0 }}
        background="neutral0"
      >
        {children}
      </Flex>
    </DrawerContentInner>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ActionsDrawer
 * -----------------------------------------------------------------------------------------------*/

const ActionsDrawer = {
  Root,
  Overlay,
  Header,
  Content,
};

export { ActionsDrawer, useActionsDrawer };
