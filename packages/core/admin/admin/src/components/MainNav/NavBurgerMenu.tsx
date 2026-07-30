import { Box, FocusTrap, Portal, ScrollArea, Flex, Divider } from '@strapi/design-system';
import { motion, AnimatePresence } from 'motion/react';
import { styled } from 'styled-components';

import { HEIGHT_TOP_NAVIGATION } from '../../constants/theme';
import { MenuItem } from '../../core/apis/router';

import { MainNavBurgerMenuLinks } from './MainNavLinks';
import { NavUser } from './NavUser';

interface NavBurgerMenuProps {
  isShown: boolean;
  listLinks: MenuItem[];
  handleClickOnLink: (value: string) => void;
  mobile?: boolean;
  onClose: () => void;
}

const MotionLayer = styled(motion.div)`
  position: fixed;
  top: calc(${HEIGHT_TOP_NAVIGATION} + 1px);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;

  ${({ theme }) => theme.breakpoints.large} {
    display: none;
  }
`;

const Surface = styled(Box)`
  height: 100%;
  background-color: ${({ theme }) => theme.colors.neutral0};
`;

export const NavBurgerMenu = ({
  isShown,
  handleClickOnLink,
  onClose,
  listLinks,
}: NavBurgerMenuProps) => {
  return (
    <Portal>
      <AnimatePresence>
        {isShown && (
          <FocusTrap onEscape={onClose}>
            <MotionLayer
              key="burger"
              role="dialog"
              aria-modal="true"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              id="burger-menu"
            >
              <Surface>
                <ScrollArea>
                  <Flex
                    tag="ul"
                    direction="column"
                    alignItems="stretch"
                    width="100%"
                    paddingLeft={{ initial: 4, medium: 6 }}
                    paddingRight={{ initial: 4, medium: 6 }}
                    paddingTop={{ initial: 4, medium: 3 }}
                    paddingBottom={{ initial: 4, medium: 6 }}
                    gap={3}
                  >
                    <MainNavBurgerMenuLinks
                      listLinks={listLinks}
                      handleClickOnLink={handleClickOnLink}
                    />
                    <Box tag="li">
                      <Divider />
                    </Box>
                    <Box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} tag="li">
                      <NavUser showDisplayName />
                    </Box>
                  </Flex>
                </ScrollArea>
              </Surface>
            </MotionLayer>
          </FocusTrap>
        )}
      </AnimatePresence>
    </Portal>
  );
};
