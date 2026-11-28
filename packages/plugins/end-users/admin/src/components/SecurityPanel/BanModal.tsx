import * as React from 'react';

import { Form, UnsavedChangesModal } from '@strapi/admin/strapi-admin';
import { Button, Flex, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../utils/getTranslation';
import { SelectField, TextField } from '../FormFields';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a ban lasts, in days: `never` is no end */
const DURATIONS = ['never', '1', '7', '30'] as const;

type Duration = (typeof DURATIONS)[number];

interface BanModalProps {
  open: boolean;
  onClose: () => void;
  /** Bans the user. Resolves `true` when the ban was made, and the modal then closes. */
  onBan: (ban: { reason?: string; expiresAt?: string }) => Promise<boolean>;
}

interface BanValues {
  reason: string;
  duration: Duration;
}

const INITIAL_VALUES: BanValues = { reason: '', duration: 'never' };

/** Asks why a user is banned and for how long. The Ban button is the confirmation. */
const BanModal = ({ open, onClose, onBan }: BanModalProps) => {
  const { formatMessage } = useIntl();

  const labels: Record<Duration, string> = {
    never: formatMessage({
      id: getTranslation('security-panel.ban.never'),
      defaultMessage: 'Until lifted',
    }),
    '1': formatMessage({
      id: getTranslation('security-panel.ban.one-day'),
      defaultMessage: '1 day',
    }),
    '7': formatMessage({
      id: getTranslation('security-panel.ban.seven-days'),
      defaultMessage: '7 days',
    }),
    '30': formatMessage({
      id: getTranslation('security-panel.ban.thirty-days'),
      defaultMessage: '30 days',
    }),
  };

  const handleBan = async ({ reason, duration }: BanValues) => {
    const trimmed = reason.trim();

    const banned = await onBan({
      ...(trimmed !== '' && { reason: trimmed }),
      ...(duration !== 'never' && {
        expiresAt: new Date(Date.now() + Number(duration) * DAY_MS).toISOString(),
      }),
    });

    if (banned) {
      onClose();
    }
  };

  return (
    <UnsavedChangesModal open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('security-panel.ban.title'),
              defaultMessage: 'Ban this user',
            })}
          </Modal.Title>
        </Modal.Header>
        <Form method="POST" initialValues={INITIAL_VALUES} onSubmit={handleBan}>
          {({ isSubmitting }) => (
            <>
              <Modal.Body>
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <TextField
                    name="reason"
                    label={formatMessage({
                      id: getTranslation('security-panel.ban.reason'),
                      defaultMessage: 'Reason',
                    })}
                    hint={formatMessage({
                      id: getTranslation('security-panel.ban.reason-hint'),
                      defaultMessage: 'Only administrators see the reason.',
                    })}
                  />
                  <SelectField
                    name="duration"
                    label={formatMessage({
                      id: getTranslation('security-panel.ban.duration'),
                      defaultMessage: 'Ban lasts',
                    })}
                    options={DURATIONS.map((value) => ({ value, label: labels[value] }))}
                  />
                </Flex>
              </Modal.Body>
              <Modal.Footer>
                <Modal.Close>
                  <Button variant="tertiary" type="button">
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                </Modal.Close>
                <Button variant="danger" type="submit" loading={isSubmitting}>
                  {formatMessage({
                    id: getTranslation('security-panel.ban.confirm'),
                    defaultMessage: 'Ban',
                  })}
                </Button>
              </Modal.Footer>
            </>
          )}
        </Form>
      </Modal.Content>
    </UnsavedChangesModal>
  );
};

export { BanModal };
export type { BanModalProps };
