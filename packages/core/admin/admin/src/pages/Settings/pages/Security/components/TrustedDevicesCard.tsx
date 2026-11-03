import * as React from 'react';

import { Box, Checkbox, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { Panel } from '../../../../../components/Panel';

import type { TrustedDeviceSettings } from '../../../../../../../shared/contracts/security-settings';

/** The card's slice of the page draft. `days` is the raw field value, so an empty or out-of-range
 * entry shows as a validation error instead of being coerced away. */
interface TrustedDevicesDraft extends Omit<TrustedDeviceSettings, 'days'> {
  days: number | null;
}

interface TrustedDevicesCardProps {
  value: TrustedDevicesDraft;
  onChange: (value: TrustedDevicesDraft) => void;
  canUpdate: boolean;
  /** The days field's validation error. */
  daysError?: string;
  /** A refused save that concerns this card only. */
  saveError?: string;
}

const DAYS_MIN = 1;
const DAYS_MAX = 90;

const isValidDays = (value: number | null) =>
  value !== null && Number.isInteger(value) && value >= DAYS_MIN && value <= DAYS_MAX;

/**
 * The second card on the Security page: whether a user may trust a browser after entering a code,
 * and for how long. It holds no state of its own; the page owns the draft and saves it with the
 * other cards. The period field is disabled while trust is off so the only way to lengthen it is
 * the one the server treats as a downgrade (`isTrustedDevicesDowngrade`).
 */
const TrustedDevicesCard = ({
  value,
  onChange,
  canUpdate,
  daysError,
  saveError,
}: TrustedDevicesCardProps) => {
  const { formatMessage } = useIntl();
  const titleId = React.useId();
  const { enabled, days } = value;

  return (
    // `Panel` hardcodes its own outer `Box` and forwards props only to the inner `Flex`, so a
    // `tag` given to it would land inside the panel rather than on its root. The `section`
    // landmark goes on this wrapper, which adds no styling of its own.
    <Box tag="section" aria-labelledby={titleId}>
      <Panel gap={5}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" tag="h2" id={titleId}>
            {formatMessage({
              id: 'Settings.security.trustedDevices.title',
              defaultMessage: 'Trusted devices',
            })}
          </Typography>
          <Typography textColor="neutral600">
            {formatMessage({
              id: 'Settings.security.trustedDevices.description',
              defaultMessage:
                'After entering a code, a user may trust the browser they are on and skip the code there until the trust expires. The password is still required at every login.',
            })}
          </Typography>
        </Flex>

        <Flex direction="column" alignItems="stretch" gap={2}>
          <Checkbox
            name="trusted-devices-enabled"
            disabled={!canUpdate}
            checked={enabled}
            onCheckedChange={(checked) => onChange({ ...value, enabled: checked === true })}
          >
            {formatMessage({
              id: 'Settings.security.trustedDevices.enabled.label',
              defaultMessage: 'Allow users to trust a device after entering a code',
            })}
          </Checkbox>
          <ErrorMessage error={saveError} />
        </Flex>

        <Box maxWidth="24rem">
          <Field.Root
            name="trustedDeviceDays"
            required
            error={daysError}
            hint={formatMessage({
              id: 'Settings.security.trustedDevices.days.hint',
              defaultMessage: 'How long a trusted browser can skip the code.',
            })}
          >
            <Field.Label>
              {formatMessage({
                id: 'Settings.security.trustedDevices.days.label',
                defaultMessage: 'Trust period (days)',
              })}
            </Field.Label>
            {/* A native number input, for the same testability reason as the grace-days field. */}
            <TextInput
              type="number"
              inputMode="numeric"
              min={DAYS_MIN}
              max={DAYS_MAX}
              step={1}
              disabled={!canUpdate || !enabled}
              value={days ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const raw = e.target.value;
                onChange({ ...value, days: raw === '' ? null : Number(raw) });
              }}
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>
        </Box>
      </Panel>
    </Box>
  );
};

export { TrustedDevicesCard, DAYS_MIN, DAYS_MAX, isValidDays };
export type { TrustedDevicesCardProps, TrustedDevicesDraft };
