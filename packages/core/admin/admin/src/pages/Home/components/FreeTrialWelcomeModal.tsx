import { useState } from 'react';

import { Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import styled from 'styled-components';

// TODO: Re-export image without the close button
import { useLicenseLimits } from '../../../../../ee/admin/src/hooks/useLicenseLimits';
import lightIllustration from '../../../assets/images/free-trial.svg';
import { usePersistentState } from '../../../hooks/usePersistentState';

const StyledModalContent = styled(Modal.Content)`
  max-width: 51.6rem;
`;

const StyledModalBody = styled(Modal.Body)`
  padding: 0;
  position: relative;

  > div {
    padding: 0;
  }
`;

const StyledButton = styled(Button)`
  border: 0;
  border-radius: 50%;
`;

export const FreeTrialWelcomeModal = () => {
  const [open, setOpen] = useState(true);
  const [previouslyOpen, setPreviouslyOpen] = usePersistentState(
    'STRAPI_FREE_TRIAL_WELCOME_DIALOG',
    false
  );
  const { isTrial } = useLicenseLimits();

  const handleClose = () => {
    setPreviouslyOpen(true);
    setOpen(false);
  };

  // TODO: Translate
  const text = {
    title: "We're glad to have you on board",
    description1:
      'For the next 30 days, you will have full access to advanced features like Content History, Releases and Single Sign-On (SSO) – everything you need to explore the power of Strapi CMS.',
    description2:
      'Use this time to build, customize, and test your content workflows with complete flexibility!',
  };

  if (previouslyOpen || !isTrial) {
    return null;
  }

  return (
    <Modal.Root open={open} onOpenChange={setOpen}>
      <StyledModalContent>
        <StyledModalBody>
          <Box position="absolute" top={0} right={0} padding={2}>
            <StyledButton variant="tertiary" width="2.4rem" height="2.4rem" onClick={handleClose}>
              <Cross />
            </StyledButton>
          </Box>
          <img src={lightIllustration} alt="free-trial" width="100%" height="100%" />
          <Flex direction="column" alignItems="start" justifyContent="stretch" padding={8} gap={4}>
            <Typography variant="alpha" fontWeight="bold" fontSize={4}>
              {text.title}
            </Typography>
            <Typography>{text.description1}</Typography>
            <Typography>{text.description2}</Typography>
            <Box marginTop={4}>
              {/* TODO: Translate */}
              <Button onClick={handleClose}>Start exploring</Button>
            </Box>
          </Flex>
        </StyledModalBody>
      </StyledModalContent>
    </Modal.Root>
  );
};
