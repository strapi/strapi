import { useEffect, useState } from 'react';

import { Box, Flex, Link, Modal, Typography } from '@strapi/design-system';
import { Cross, Rocket } from '@strapi/icons';
import { styled, useTheme } from 'styled-components';

import { useTypedSelector } from '../core/store/hooks';

const StyledModalContent = styled(Modal.Content)`
  max-width: 80rem;
`;
const StyledModalBody = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  height: 90vh;
`;
const IframeWrapper = styled(Box)`
  flex: 1;
  display: flex;
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;
const StyledIframe = styled.iframe`
  border: 0;
  background: transparent;
  border-radius: ${({ theme }) => theme.borderRadius};
  width: 100%;
  height: 100%;
`;
const StyledCloseButton = styled.a`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: ${({ theme }) => theme.colors.neutral100};
  color: ${({ theme }) => theme.colors.neutral600};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 0.5rem;
`;

interface GameProps {
  children: React.ReactNode;
}

export const Game = ({ children }: GameProps) => {
  const [isGameOpen, setIsGameOpen] = useState(false);
  const { currentTheme } = useTypedSelector((state) => state.admin_app.theme);
  const theme = useTheme();

  const gameUrl = `https://rocket-dodge.apps.staging.strapi.team?theme=${currentTheme}`;

  // Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
  useEffect(() => {
    const konamiCode = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    let konamiIndex = 0;

    const handleKonamiCode = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === konamiCode[konamiIndex].toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          setIsGameOpen(true);
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };

    window.addEventListener('keydown', handleKonamiCode);
    return () => {
      window.removeEventListener('keydown', handleKonamiCode);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGameOpen(false);
      }
    };
    if (isGameOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameOpen]);
  return (
    <>
      <Modal.Root open={isGameOpen} onOpenChange={setIsGameOpen}>
        <Modal.Trigger>{children}</Modal.Trigger>

        <StyledModalContent aria-labelledby="deployment-detail_game-modal">
          <StyledModalBody>
            <Modal.Header>
              <Modal.Title>
                <Flex gap={1} alignItems="center">
                  <Rocket color={theme.colors.warning500} width="24px" height="24px" />
                  <Typography>You found an easter egg!</Typography>
                </Flex>
              </Modal.Title>
            </Modal.Header>
            <Flex direction="column" gap={4} alignItems="stretch" height="100vh">
              <IframeWrapper>
                <StyledIframe src={gameUrl} allow="autoplay" allowTransparency />
              </IframeWrapper>
              <Flex justifyContent="center" paddingBottom={4}>
                <Typography variant="pi" textColor="neutral600">
                  Made with{' '}
                  <Link href="https://www.fimo.ai/" isExternal rel="noopener noreferrer">
                    FIMO
                  </Link>
                </Typography>
              </Flex>
            </Flex>
          </StyledModalBody>
        </StyledModalContent>
      </Modal.Root>
    </>
  );
};
