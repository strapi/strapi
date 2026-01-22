import * as React from 'react';

import { WIDTH_SIDE_NAVIGATION } from '@strapi/admin/strapi-admin';
import { Portal, Flex, Box, ScrollArea, VisuallyHidden } from '@strapi/design-system';
import { CaretDown, CaretUp } from '@strapi/icons';
import { styled } from 'styled-components';

const DrawerContainer = styled(Portal)<{ $isOpen: boolean; $hasSideNav: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;

  ${({ theme }) => theme.breakpoints.medium} {
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
  transition: opacity 0.2s ease-in-out;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};

  ${({ theme }) => theme.breakpoints.medium} {
    left: ${({ $hasSideNav }) => ($hasSideNav ? WIDTH_SIDE_NAVIGATION : 0)};
  }
`;

const ToggleButton = styled.button`
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
  max-height: calc(100vh - 16rem);
  position: relative;
  z-index: 1;
  pointer-events: auto;
`;

const DrawerContentInner = styled(ScrollArea)<{ $isOpen: boolean }>`
  max-height: ${({ $isOpen }) => ($isOpen ? 'calc(100vh - 20rem)' : '0')};
  overflow: hidden;
  transition: max-height 0.2s ease-in-out;
`;

const ActionsDrawer = ({
  children,
  headerContent,
  hasSideNav = false,
  hasContent = true,
}: {
  children?: React.ReactNode;
  headerContent: React.ReactNode;
  hasSideNav?: boolean;
  hasContent?: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOpen = () => {
    setIsOpen((prev: boolean) => !prev);
  };

  React.useEffect(() => {
    if (!hasContent && isOpen) {
      setIsOpen(false);
    }
  }, [hasContent, isOpen]);

  return (
    <>
      <DrawerContainer $isOpen={isOpen} $hasSideNav={hasSideNav}>
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
            <Flex flex={1} gap={2} alignItems="center">
              {headerContent}
            </Flex>
            {hasContent && children && (
              <ToggleButton onClick={toggleOpen}>
                {isOpen ? <CaretUp fill="neutral600" /> : <CaretDown fill="neutral600" />}
                <VisuallyHidden>{isOpen ? 'Close' : 'Open'}</VisuallyHidden>
              </ToggleButton>
            )}
          </Flex>
          {children && (
            <DrawerContentInner $isOpen={isOpen}>
              <Flex direction="column" alignItems="stretch" justifyContent="flex-start" padding={4}>
                {children}
              </Flex>
            </DrawerContentInner>
          )}
        </DrawerContent>
        <DrawerOverlay $isOpen={isOpen} $hasSideNav={hasSideNav} onClick={() => setIsOpen(false)} />
      </DrawerContainer>
    </>
  );
};

export { ActionsDrawer };
