import * as React from 'react';

import { Box, Button, Checkbox, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { Panel } from '../../../../../components/Panel';
import { useSecuritySettingsSave } from '../hooks/useSecuritySettingsSave';
import { isTrustedDevicesDowngrade } from '../utils/isSecurityDowngrade';

import { ConfirmDowngradeDialog } from './ConfirmDowngradeDialog';

import type { TrustedDeviceSettings } from '../../../../../../../shared/contracts/security-settings';

interface TrustedDevicesCardProps {
  /** The stored policy, as `GET /admin/security-settings` returned it. */
  settings: TrustedDeviceSettings;
  canUpdate: boolean;
  /** `/admin/mfa/me` `enabled` for the caller: decides whether a downgrade also needs a code. */
  callerEnrolled: boolean;
  /** `isFetching` of the `SecuritySettings` query; keeps Save disabled while the saved result lands. */
  isRefreshing?: boolean;
}

const DAYS_MIN = 1;
const DAYS_MAX = 90;

const isValidDays = (value: number | null) =>
  value !== null && Number.isInteger(value) && value >= DAYS_MIN && value <= DAYS_MAX;

/**
 * The second card on the Security page. Owns a draft of the `trustedDevices` object and
 * saves it alone: `PUT /admin/security-settings` is per-object, so the body never carries `mfa`.
 * Disabling or shortening saves directly; enabling, or lengthening while enabled, is a downgrade
 * (`isTrustedDevicesDowngrade`) and first collects the caller's password, plus a code when they
 * are enrolled, through the same `ConfirmDowngradeDialog` the enforcement card uses. The period
 * field is disabled while trust is off so the only way to lengthen it is the one the server
 * treats as a downgrade.
 */
const TrustedDevicesCard = ({
  settings,
  canUpdate,
  callerEnrolled,
  isRefreshing = false,
}: TrustedDevicesCardProps) => {
  const { formatMessage } = useIntl();
  const titleId = React.useId();

  const [enabled, setEnabled] = React.useState(settings.enabled);
  // Kept as the raw field value so an empty or out-of-range entry shows as a validation error
  // instead of being coerced away.
  const [days, setDays] = React.useState<number | null>(settings.days);
  const [daysError, setDaysError] = React.useState<string>();

  React.useEffect(() => {
    setEnabled(settings.enabled);
    setDays(settings.days);
  }, [settings]);

  const next: TrustedDeviceSettings = { enabled, days: days ?? settings.days };
  const modified = !isEqual(next, settings);

  const { save, isSaving, saveError, downgradeOpen, closeDowngrade, confirmDowngrade } =
    useSecuritySettingsSave({
      patch: { trustedDevices: next },
      requiresCredentials: isTrustedDevicesDowngrade(settings, next),
      validate: () => {
        if (!isValidDays(days)) {
          setDaysError(
            formatMessage({
              id: 'Settings.security.trustedDevices.days.error',
              defaultMessage: 'Enter a whole number of days between 1 and 90',
            })
          );
          return false;
        }
        setDaysError(undefined);
        return true;
      },
    });

  return (
    // `Panel` itself is fixed to a `div` root (its `FlexProps` are not generic over `tag`), so the
    // accessible region is this wrapping `Box`: it renders no styling of its own, only the
    // `section` landmark named by the card's own heading.
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
            onCheckedChange={(checked) => {
              const isChecked = checked === true;
              setEnabled(isChecked);
              if (!isChecked) {
                // The days field is disabled while trust is off, so a value it holds from before
                // unticking (invalid or not) must never be able to block saving `enabled: false`.
                setDays(settings.days);
                setDaysError(undefined);
              }
            }}
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
              defaultMessage:
                'How long a trusted browser skips the code. Shortening it cuts existing trusts at once; lengthening it never extends a trust already granted. Changing a password does not revoke trust; revoking a device does.',
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
                setDays(raw === '' ? null : Number(raw));
                setDaysError(undefined);
              }}
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>
        </Box>

        <Flex justifyContent="flex-end">
          <Button
            onClick={save}
            loading={isSaving}
            disabled={!canUpdate || !modified || isRefreshing}
          >
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        </Flex>

        {/*
          The default copy says "lowering two-factor requirements", which is wrong for this card:
          the two changes that land here are *offering* trust and *lengthening* it. Neither
          lowers a requirement in the user's sense -- both let a browser skip the code step for
          longer, which is why the server asks for credentials -- so the dialog says what is
          actually changing, the way `PasskeysCard` does.
        */}
        <ConfirmDowngradeDialog
          open={downgradeOpen}
          requiresCode={callerEnrolled}
          onClose={closeDowngrade}
          onConfirm={confirmDowngrade}
          title={formatMessage({
            id: 'Settings.security.trustedDevices.widen.title',
            defaultMessage: 'Let browsers skip the code for longer?',
          })}
          description={formatMessage({
            id: 'Settings.security.trustedDevices.widen.description',
            defaultMessage:
              'A trusted browser will not ask for a two-factor code until the trust expires. Confirm your password to continue.',
          })}
        />
      </Panel>
    </Box>
  );
};

export { TrustedDevicesCard };
export type { TrustedDevicesCardProps };
