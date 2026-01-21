import { useState } from 'react';

import { Portal, Flex, Box, ScrollArea, VisuallyHidden } from '@strapi/design-system';
import { CaretDown, CaretUp } from '@strapi/icons';
import { styled } from 'styled-components';

const DrawerContainer = styled(Portal)<{ $isOpen: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
`;

const DrawerOverlay = styled(Box)<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity 0.2s ease-in-out;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
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
  padding: 0;
`;

const DrawerContent = styled(Flex)`
  flex-direction: column;
  align-items: stretch;
  max-height: calc(100vh - 16rem);
  position: relative;
  z-index: 1;
`;

const DrawerContentInner = styled(ScrollArea)<{ $isOpen: boolean }>`
  max-height: ${({ $isOpen }) => ($isOpen ? 'calc(100vh - 20rem)' : '0')};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  overflow: hidden;
  transition: all 0.2s ease-in-out;
`;

const ActionsDrawer = ({
  children,
  headerContent,
}: {
  children: React.ReactNode;
  headerContent: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <DrawerContainer $isOpen={isOpen}>
        <DrawerOverlay $isOpen={isOpen} />
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
            <ToggleButton onClick={toggleOpen}>
              {isOpen ? <CaretUp fill="neutral600" /> : <CaretDown fill="neutral600" />}
              <VisuallyHidden>{isOpen ? 'Close' : 'Open'}</VisuallyHidden>
            </ToggleButton>
          </Flex>
          <DrawerContentInner $isOpen={isOpen}>
            <Flex direction="column" alignItems="stretch" justifyContent="flex-start" padding={4}>
              {children}
            </Flex>
          </DrawerContentInner>
        </DrawerContent>
      </DrawerContainer>
    </>
  );
};

export { ActionsDrawer };
