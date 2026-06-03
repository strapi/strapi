import { useState } from 'react';

import { Box, Button, Flex, LinkButton, Modal, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { isAfter, subDays } from 'date-fns';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useLicenseLimits } from '../../../../../ee/admin/src/hooks/useLicenseLimits';
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
`;

export const FreeTrialEndedModal = () => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(true);
  const [previouslyOpen, setPreviouslyOpen] = useScopedPersistentState(
    'STRAPI_FREE_TRIAL_ENDED_MODAL',
    false
  );
  const [cachedTrialEndsAt] = useScopedPersistentState<string | undefined>(
    'STRAPI_FREE_TRIAL_ENDS_AT',
    undefined
  );

  const { license } = useLicenseLimits();

  const sevenDaysAgo = subDays(new Date(), 7);

  // When the license is not a trial + not EE, and the cached trial end date is found in the localstorage, that means the trial has ended
  // We show the banner to encourage the user to upgrade (for 7 days after the trial ends)
  const isTrialEndedRecently = Boolean(
    !license?.isTrial &&
      !window.strapi.isEE &&
      cachedTrialEndsAt &&
      isAfter(new Date(cachedTrialEndsAt), sevenDaysAgo)
  );

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

  if (!previouslyOpen && isTrialEndedRecently) {
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
                variant="ghost"
                width="2.4rem"
                height="2.4rem"
                onClick={handleClose}
              >
                <Cross />
              </StyledButton>
            </Box>
            <Flex
              direction="column"
              alignItems="start"
              justifyContent="stretch"
              padding={8}
              gap={4}
            >
              <Typography variant="alpha" fontWeight="bold" fontSize={4} id="title">
                {formatMessage({
                  id: 'app.components.FreeTrialEndedModal.title',
                  defaultMessage: 'Your trial has ended',
                })}
              </Typography>
              <Typography>
                {formatMessage({
                  id: 'app.components.FreeTrialEndedModal.description',
                  defaultMessage:
                    'Your access to Growth plan features such as Content history, Releases and Single sign-On (SSO) has expired.',
                })}
              </Typography>
              <Box background="primary200" padding={4} hasRadius>
                <Typography fontWeight="bold">
                  {formatMessage({
                    id: 'app.components.FreeTrialEndedModal.notice.title',
                    defaultMessage: 'Important to know:',
                  })}
                </Typography>
                <ul style={{ listStyleType: 'disc', marginLeft: '1.5rem' }}>
                  <li>
                    <Typography>
                      {formatMessage({
                        id: 'app.components.FreeTrialEndedModal.notice.item1',
                        defaultMessage: 'Downgrading will remove access to the above features.',
                      })}
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      {formatMessage({
                        id: 'app.components.FreeTrialEndedModal.notice.item2',
                        defaultMessage: 'Document version history will be deleted.',
                      })}
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      {formatMessage({
                        id: 'app.components.FreeTrialEndedModal.notice.item3',
                        defaultMessage: 'All releases will be erased.',
                      })}
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      {formatMessage({
                        id: 'app.components.FreeTrialEndedModal.notice.item4',
                        defaultMessage:
                          'If you downgrade ensure to set a root admin password to keep access to the admin panel.',
                      })}
                    </Typography>
                  </li>
                </ul>
              </Box>
              <Flex marginTop={4} gap={2}>
                <LinkButton href="https://strapi.chargebeeportal.com/" target="_blank">
                  {formatMessage({
                    id: 'app.components.FreeTrialEndedModal.button.upgrade',
                    defaultMessage: 'Stay on the Growth plan',
                  })}
                </LinkButton>
                <Button variant="tertiary" onClick={handleClose}>
                  {formatMessage({
                    id: 'app.components.FreeTrialEndedModal.button.downgrade',
                    defaultMessage: 'Downgrade to Community',
                  })}
                </Button>
              </Flex>
            </Flex>
          </StyledModalBody>
        </StyledModalContent>
      </Modal.Root>
    );
  }

  return null;
};
