import { useState } from 'react';

import { Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useLicenseLimits } from '../../../../../ee/admin/src/hooks/useLicenseLimits';
import lightIllustration from '../../../assets/images/free-trial.png';
import { useScopedPersistentState } from '../../../hooks/usePersistentState';

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

  > span {
    line-height: 0;
  }
`;

export const FreeTrialWelcomeModal = () => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(true);
  const [previouslyOpen, setPreviouslyOpen] = useScopedPersistentState(
    'STRAPI_FREE_TRIAL_WELCOME_MODAL',
    false
  );
  const { license } = useLicenseLimits();

  const handleClose = () => {
    setPreviouslyOpen(true);
    setOpen(false);
  };

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPreviouslyOpen(true);
    }

    setOpen(isOpen);
  };

  if (previouslyOpen || !license?.isTrial) {
    return null;
  }

  return (
    <Modal.Root open={open} onOpenChange={handleOnOpenChange}>
      <StyledModalContent aria-labelledby="title">
        <StyledModalBody>
          <Box position="absolute" top={0} right={0} padding={2}>
            <StyledButton
              aria-label={formatMessage({
                id: 'app.utils.close-label',
                defaultMessage: 'Close',
              })}
              variant="tertiary"
              width="2.4rem"
              height="2.4rem"
              onClick={handleClose}
            >
              <Cross />
            </StyledButton>
          </Box>
          <img src={lightIllustration} alt="free-trial" width="100%" height="100%" />
          <Flex direction="column" alignItems="start" justifyContent="stretch" padding={8} gap={4}>
            <Typography variant="alpha" fontWeight="bold" fontSize={4} id="title">
              {formatMessage({
                id: 'app.components.FreeTrialWelcomeModal.title',
                defaultMessage: "We're glad to have you on board",
              })}
            </Typography>
            <Typography>
              {formatMessage({
                id: 'app.components.FreeTrialWelcomeModal.description1',
                defaultMessage:
                  'For the next 30 days, you will have full access to advanced features like Content History, Releases and Single Sign-On (SSO) – everything you need to explore the power of Strapi CMS.',
              })}
            </Typography>
            <Typography>
              {formatMessage({
                id: 'app.components.FreeTrialWelcomeModal.description2',
                defaultMessage:
                  'Use this time to build, customize, and test your content workflows with complete flexibility!',
              })}
            </Typography>
            <Box marginTop={4}>
              <Button onClick={handleClose}>
                {formatMessage({
                  id: 'app.components.FreeTrialWelcomeModal.button',
                  defaultMessage: 'Start exploring',
                })}
              </Button>
            </Box>
          </Flex>
        </StyledModalBody>
      </StyledModalContent>
    </Modal.Root>
  );
};
