import { useState } from 'react';

import { Box, Button, Flex, LinkButton, Modal, Typography } from '@strapi/design-system';
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

export const FreeTrialEndedModal = () => {
  const [open, setOpen] = useState(true);
  const [previouslyOpen, setPreviouslyOpen] = usePersistentState(
    'STRAPI_FREE_TRIAL_ENDED_DIALOG',
    false
  );
  const { isTrial } = useLicenseLimits();

  const handleClose = () => {
    setPreviouslyOpen(true);
    setOpen(false);
  };

  // TODO: Translate
  const text = {
    title: 'Your trial has ended',
    description:
      'Your access to Growth plan features such as Content history, Releases and Single sign-On (SSO) has expired.',
    notice: {
      title: 'Important to know:',
      item1: 'Downgrading will remove access to the above features.',
      item2: 'Document version history will be deleted.',
      item3: 'All releases will be erased.',
      item4:
        'If you downgrade ensure to set a root admin password to keep access to the admin panel.',
    },
  };

  if (previouslyOpen || !isTrial) {
    return null;
  }

  return (
    <Modal.Root open={open} onOpenChange={setOpen}>
      <StyledModalContent>
        <StyledModalBody>
          <Box position="absolute" top={0} right={0} padding={2}>
            <StyledButton variant="ghost" width="2.4rem" height="2.4rem" onClick={handleClose}>
              <Cross />
            </StyledButton>
          </Box>
          <Flex direction="column" alignItems="start" justifyContent="stretch" padding={8} gap={4}>
            <Typography variant="alpha" fontWeight="bold" fontSize={4}>
              {text.title}
            </Typography>
            <Typography>{text.description}</Typography>
            <Box background="primary200" padding={4} hasRadius>
              <Typography fontWeight="bold">{text.notice.title}</Typography>
              <ul style={{ listStyleType: 'disc', marginLeft: '1.5rem' }}>
                <li>
                  <Typography>{text.notice.item1}</Typography>
                </li>
                <li>
                  <Typography>{text.notice.item2}</Typography>
                </li>
                <li>
                  <Typography>{text.notice.item3}</Typography>
                </li>
                <li>
                  <Typography>{text.notice.item4}</Typography>
                </li>
              </ul>
            </Box>
            <Flex marginTop={4} gap={2}>
              <LinkButton href="https://strapi.chargebeeportal.com/" target="_blank">
                {/* TODO: Translate */}
                Stay on the Growth plan
              </LinkButton>
              <Button variant="tertiary" onClick={handleClose}>
                {/* TODO: Translate */}
                Downgrade to Community
              </Button>
            </Flex>
          </Flex>
        </StyledModalBody>
      </StyledModalContent>
    </Modal.Root>
  );
};
