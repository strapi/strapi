import * as React from 'react';

import {
  Button,
  Field,
  Flex,
  Modal,
  SingleSelect,
  SingleSelectOption,
  TextInput,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../utils/getTranslation';

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

/** Asks why a user is banned and for how long. The Ban button is the confirmation. */
const BanModal = ({ open, onClose, onBan }: BanModalProps) => {
  const { formatMessage } = useIntl();
  const [reason, setReason] = React.useState('');
  const [duration, setDuration] = React.useState<Duration>('never');
  const [isBanning, setIsBanning] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setDuration('never');
    }
  }, [open]);

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

  const handleBan = async () => {
    const trimmed = reason.trim();

    setIsBanning(true);

    try {
      const banned = await onBan({
        ...(trimmed !== '' && { reason: trimmed }),
        ...(duration !== 'never' && {
          expiresAt: new Date(Date.now() + Number(duration) * DAY_MS).toISOString(),
        }),
      });

      if (banned) {
        onClose();
      }
    } finally {
      setIsBanning(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('security-panel.ban.title'),
              defaultMessage: 'Ban this user',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Field.Root
              hint={formatMessage({
                id: getTranslation('security-panel.ban.reason-hint'),
                defaultMessage: 'Only administrators see the reason.',
              })}
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation('security-panel.ban.reason'),
                  defaultMessage: 'Reason',
                })}
              </Field.Label>
              <TextInput value={reason} onChange={(event) => setReason(event.target.value)} />
              <Field.Hint />
            </Field.Root>
            <Field.Root>
              <Field.Label>
                {formatMessage({
                  id: getTranslation('security-panel.ban.duration'),
                  defaultMessage: 'Ban lasts',
                })}
              </Field.Label>
              <SingleSelect
                value={duration}
                onChange={(next) => setDuration(String(next) as Duration)}
              >
                {DURATIONS.map((option) => (
                  <SingleSelectOption key={option} value={option}>
                    {labels[option]}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          </Modal.Close>
          <Button variant="danger" loading={isBanning} onClick={handleBan}>
            {formatMessage({
              id: getTranslation('security-panel.ban.confirm'),
              defaultMessage: 'Ban',
            })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { BanModal };
export type { BanModalProps };
